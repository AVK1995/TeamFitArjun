import { NextResponse } from "next/server";
import type Razorpay from "razorpay";
import { verifyRazorpayWebhookSignature, getRazorpay } from "@/lib/razorpay";
import { firePabblyWebhook } from "@/lib/pabbly";
import { fireMetaCapi } from "@/lib/capi";
import { claimEventId } from "@/lib/dedup";
import { extractClientIp, extractUserAgent } from "@/lib/request";
import { isProductionServer, isPaidAmount } from "@/lib/tracking-gate";
import { clientConfig } from "@/client.config";
import type { CustomerPayload, UtmPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook receiver — server-side fallback for payment.captured.
 *
 * If the browser dies between Razorpay's checkout.js callback and our
 * /api/razorpay/verify-payment fetch, this picks up the slack and fires
 * the same dual CAPI events (Purchase + sales) PLUS the same complete
 * Pabbly purchase webhook with event_id = payment_id.
 *
 * Data parity: create-order packs every field Pabbly needs into Razorpay
 * order `notes` (first_name, last_name, customer_email, customer_phone,
 * country_code, city, utm_source/medium/campaign/content/term, fbclid,
 * gclid, landing_url, referrer). This route reads those notes back via
 * orders.fetch (with retry) so the Pabbly row from a webhook fallback is
 * indistinguishable from one fired by verify-payment.
 *
 * Dedup: claimEventId(payment_id) ensures we never double-fire when
 * verify-payment has already processed this payment.
 *
 * Razorpay dashboard setup:
 *   - URL: https://teamfitarjun.com/api/razorpay/webhook
 *   - Active events: payment.captured ONLY
 *   - Secret: matches RAZORPAY_WEBHOOK_SECRET in Vercel env
 */
export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyRazorpayWebhookSignature({ body: rawBody, signature })) {
    console.warn("[webhook] invalid signature");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (payload.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: payload.event });
  }

  const payment = payload.payload?.payment?.entity;
  if (!payment) {
    return NextResponse.json({ ok: false, error: "missing payment entity" }, { status: 400 });
  }

  const orderId = payment.order_id;
  const paymentId = payment.id;
  const eventId = paymentId;

  if (!claimEventId(eventId)) {
    console.log(`[webhook] event_id ${eventId} already claimed — verify-payment beat us, no-op`);
    return NextResponse.json({ ok: true, deduped: true });
  }

  // Pull the full payload from Razorpay order notes (set by create-order).
  // Retry once with backoff to absorb transient Razorpay API blips.
  const notes = await fetchOrderNotesWithRetry(orderId);

  const customer: CustomerPayload = {
    firstName: notes.first_name ?? "",
    lastName: notes.last_name ?? "",
    email: String(payment.email ?? notes.customer_email ?? ""),
    phone: String(payment.contact ?? notes.customer_phone ?? ""),
    countryCode: notes.country_code || "IN",
    city: notes.city ?? "",
  };

  const utm: UtmPayload = {
    utm_source: notes.utm_source ?? "",
    utm_medium: notes.utm_medium ?? "",
    utm_campaign: notes.utm_campaign ?? "",
    utm_content: notes.utm_content ?? "",
    utm_term: notes.utm_term ?? "",
    fbclid: notes.fbclid ?? "",
    gclid: notes.gclid ?? "",
    landing_url: notes.landing_url ?? "",
    referrer: notes.referrer ?? "",
  };

  // Loud diagnostic if notes were missing — this means create-order didn't
  // receive the customer/utm payload OR Razorpay returned no notes for the
  // order. Either is a real bug worth surfacing in Vercel logs.
  if (!customer.firstName && !customer.lastName) {
    console.warn(
      `[webhook] order ${orderId} notes missing identity fields — Pabbly row will be partial. Investigate create-order body or Razorpay orders.fetch behavior.`,
    );
  }

  if (!customer.email && !customer.phone) {
    console.warn(`[webhook] no contact info for order ${orderId} — skipping`);
    return NextResponse.json({ ok: true, skipped: "no contact info" });
  }

  const clientIp = extractClientIp(request);
  const clientUserAgent = extractUserAgent(request);
  const eventSourceUrl = `https://${clientConfig.brand.domain}/thank-you`;
  const valueRupees = (payment.amount ?? clientConfig.pricing.paise) / 100;

  // Same two gates as verify-payment: production host + paid amount > ₹1.
  const onProductionHost = isProductionServer(request);
  const isRealPurchase = isPaidAmount(valueRupees);

  if (!(onProductionHost && isRealPurchase)) {
    console.log(
      `[webhook] tracking suppressed — onProductionHost=${onProductionHost}, isRealPurchase=${isRealPurchase} (value=${valueRupees})`,
    );
    return NextResponse.json({ ok: true, suppressed: true });
  }

  void firePabblyWebhook({
    customer,
    utm,
    paymentId,
    orderId,
    amount: String(valueRupees),
    currency: String(payment.currency ?? clientConfig.pricing.currency),
    timezone: clientConfig.event.timezone,
  });

  if (clientConfig.capi.enabled) {
    void fireMetaCapi({
      customer,
      eventNames: ["Purchase", "sales"],
      eventId,
      value: valueRupees,
      currency: String(payment.currency ?? clientConfig.pricing.currency),
      paymentId,
      eventSourceUrl,
      clientIp,
      clientUserAgent,
      testEventCode: process.env.META_CAPI_TEST_EVENT_CODE,
    });
  }

  console.log(
    `[webhook] fired for event_id=${eventId} — Pabbly + CAPI dispatched with full notes payload`,
  );
  return NextResponse.json({ ok: true, eventId });
}

/**
 * orders.fetch with one retry. Razorpay's API occasionally returns a transient
 * 5xx or rate-limit error; a single retry after 300ms typically resolves it
 * without delaying the webhook response noticeably.
 */
async function fetchOrderNotesWithRetry(orderId: string): Promise<Record<string, string>> {
  let razorpay: Razorpay;
  try {
    razorpay = getRazorpay();
  } catch (err) {
    console.error("[webhook] Razorpay SDK init failed", err);
    return {};
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const order = await razorpay.orders.fetch(orderId);
      return (order.notes ?? {}) as Record<string, string>;
    } catch (err) {
      if (attempt === 0) {
        console.warn(
          `[webhook] orders.fetch(${orderId}) failed on attempt 1 — retrying in 300ms`,
          err,
        );
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      console.error(
        `[webhook] orders.fetch(${orderId}) failed twice — returning empty notes`,
        err,
      );
      return {};
    }
  }
  return {};
}

interface WebhookPayload {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        email?: string;
        contact?: string;
      };
    };
  };
}

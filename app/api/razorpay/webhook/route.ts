import { NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature, getRazorpay } from "@/lib/razorpay";
import { firePabblyWebhook } from "@/lib/pabbly";
import { fireMetaCapi } from "@/lib/capi";
import { claimEventId } from "@/lib/dedup";
import { extractClientIp, extractUserAgent } from "@/lib/request";
import { isProductionServer, isPaidAmount } from "@/lib/tracking-gate";
import { clientConfig } from "@/client.config";
import type { CustomerPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook receiver — server-side fallback for payment.captured.
 *
 * If the browser dies between Razorpay's checkout.js callback and our
 * /api/razorpay/verify-payment fetch, this picks up the slack and fires
 * the same dual CAPI events (Purchase + sales) with event_id = payment_id.
 * claimEventId() ensures that when verify-payment already fired, this is a no-op.
 *
 * Razorpay dashboard setup:
 *   - URL: https://{domain}/api/razorpay/webhook
 *   - Active events: payment.captured (and optionally payment.failed)
 *   - Secret: matches RAZORPAY_WEBHOOK_SECRET
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

  // Pull richer detail from Razorpay so EMQ has more fields than the bare
  // webhook payload exposes (it doesn't include customer state/zip by default).
  let customer: CustomerPayload;
  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.fetch(orderId);
    const notes = (order.notes ?? {}) as Record<string, string>;
    customer = {
      firstName: notes.first_name ?? "",
      lastName: notes.last_name ?? "",
      email: String(payment.email ?? notes.customer_email ?? ""),
      phone: String(payment.contact ?? notes.customer_phone ?? ""),
      countryCode: notes.country_code ?? "IN",
      city: notes.city ?? "",
      state: notes.state,
      zipCode: notes.zip_code,
    };
  } catch (err) {
    console.warn("[webhook] could not fetch order details — using bare webhook fields", err);
    customer = {
      firstName: "",
      lastName: "",
      email: String(payment.email ?? ""),
      phone: String(payment.contact ?? ""),
      countryCode: "IN",
      city: "",
    };
  }

  if (!customer.email && !customer.phone) {
    console.warn(`[webhook] no contact info for order ${orderId} — skipping CAPI to avoid low-EMQ event`);
    return NextResponse.json({ ok: true, skipped: "no contact info" });
  }

  const clientIp = extractClientIp(request);
  const clientUserAgent = extractUserAgent(request);
  const eventSourceUrl = `https://${clientConfig.brand.domain}/thank-you`;
  const valueRupees = (payment.amount ?? clientConfig.pricing.paise) / 100;

  // Same two gates as verify-payment: production host + paid amount > ₹1.
  // The host check is a safety net only — in practice the user registers the
  // webhook URL in Razorpay only against the production domain, so a preview
  // deploy will never receive a webhook from Razorpay at all.
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
    utm: {},
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

  return NextResponse.json({ ok: true, eventId });
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

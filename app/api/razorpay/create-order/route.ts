import { NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { clientConfig } from "@/client.config";
import type {
  ApiErrorResponse,
  CreateOrderRequest,
  CreateOrderResponse,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_CURRENCIES = new Set(["INR"]);

export async function POST(
  request: Request,
): Promise<NextResponse<CreateOrderResponse | ApiErrorResponse>> {
  let body: CreateOrderRequest;
  try {
    body = (await request.json()) as CreateOrderRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const requested = Math.round(body.amount);
  const expected = clientConfig.pricing.price;

  if (!Number.isFinite(requested) || requested <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid amount" },
      { status: 400 },
    );
  }

  // Server enforces price — the client cannot lower it via DevTools.
  // (We still accept `amount` so future coupon flow can adjust server-side.)
  if (requested !== expected) {
    console.warn(
      `[create-order] Amount mismatch: client sent ${requested}, expected ${expected} — forcing server value`,
    );
  }
  const amount = expected;

  const currency = (body.currency || clientConfig.pricing.currency).toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    return NextResponse.json(
      { success: false, error: `Unsupported currency: ${currency}` },
      { status: 400 },
    );
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    return NextResponse.json(
      {
        success: false,
        error: "Server missing Razorpay credentials",
        code: "MISSING_KEY_ID",
      },
      { status: 500 },
    );
  }

  // Pack EVERY field the Pabbly purchase webhook needs into Razorpay's
  // order `notes`. The webhook fallback (app/api/razorpay/webhook/route.ts)
  // reads these back via orders.fetch when the browser-side verify-payment
  // call fails to land — so Pabbly gets identical complete data on either
  // delivery path.
  //
  // Razorpay's documented limit is 15 keys per `notes` object with values up
  // to 256 chars each. We keep the count at 15 exactly. Empty values are
  // sent as "" so the webhook can deterministically rebuild the payload.
  //
  // CRITICAL: The first key is `funnel: clientConfig.funnel.slug`. This is
  // the cross-business pollution guardrail. The Razorpay account that
  // processes this funnel ALSO processes payments for unrelated businesses
  // (WooCommerce sites, other coaching brands, etc.). All those payments
  // trigger OUR webhook URL because Razorpay webhook subscriptions are
  // account-level, not per-funnel. Without this marker, the webhook would
  // fire Pabbly + CAPI for every unrelated payment too, polluting CRM rows
  // and inflating Meta conversion counts. The webhook reads orders.fetch
  // notes and skips silently when notes.funnel !== clientConfig.funnel.slug.
  //
  // `referrer` was dropped to make room for `funnel`. Verify-payment still
  // ships `referrer` from browser sessionStorage on its primary path; only
  // the webhook fallback loses it (and that's a rare path).
  //
  // `gclid` was dropped to make room for `fbp` (the Facebook browser-id
  // cookie). fbp is critical for Meta CAPI EMQ — Meta credits a ~13%
  // match-quality boost for sending it on every event. Without storing it
  // in order notes, the webhook fallback path would have no way to recover
  // it (it's a random per-browser cookie, not derivable from anything else).
  // gclid was only useful for Google Ads CAPI, which this Meta-driven
  // funnel doesn't fire. The verify-payment path still ships gclid from
  // browser sessionStorage on its primary path; only the webhook fallback
  // loses it.
  const customer = body.customer ?? {};
  const utm = body.utm ?? {};
  const clamp = (v: string | undefined): string => (v ?? "").toString().slice(0, 256);

  const notes: Record<string, string> = {
    funnel: clientConfig.funnel.slug,
    first_name: clamp(customer.firstName),
    last_name: clamp(customer.lastName),
    customer_email: clamp(customer.email),
    customer_phone: clamp(customer.phone),
    country_code: clamp(customer.countryCode),
    city: clamp(customer.city),
    utm_source: clamp(utm.utm_source),
    utm_medium: clamp(utm.utm_medium),
    utm_campaign: clamp(utm.utm_campaign),
    utm_content: clamp(utm.utm_content),
    utm_term: clamp(utm.utm_term),
    fbclid: clamp(utm.fbclid),
    fbp: clamp(body.fbp),
    landing_url: clamp(utm.landing_url),
  };

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes,
    });

    return NextResponse.json({
      orderId: order.id,
      amount,
      currency,
      keyId,
      // Placeholder — the real event_id used downstream is the Razorpay
      // payment_id, which is only known after the payment completes.
      eventId: order.id,
    });
  } catch (err) {
    console.error("[create-order] Razorpay order creation failed", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create Razorpay order",
        code: "RAZORPAY_ORDER_FAILED",
      },
      { status: 500 },
    );
  }
}

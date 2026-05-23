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
  const customer = body.customer ?? {};
  const utm = body.utm ?? {};
  const clamp = (v: string | undefined): string => (v ?? "").toString().slice(0, 256);

  const notes: Record<string, string> = {
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
    gclid: clamp(utm.gclid),
    landing_url: clamp(utm.landing_url),
    referrer: clamp(utm.referrer),
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

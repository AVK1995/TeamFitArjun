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

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        source: clientConfig.funnel.slug,
        product: clientConfig.brand.productName,
        ...(body.coupon ? { coupon: body.coupon } : {}),
        ...(body.customer?.email ? { customer_email: body.customer.email } : {}),
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount,
      currency,
      keyId,
      // event_id = order.id — single deterministic value used by both
      // server CAPI (in verify-payment) and browser Pixel (in /thank-you).
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

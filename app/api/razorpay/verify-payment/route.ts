import { NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { firePabblyWebhook } from "@/lib/pabbly";
import { fireMetaCapi } from "@/lib/capi";
import { claimEventId } from "@/lib/dedup";
import {
  extractClientIp,
  extractUserAgent,
  extractEventSourceUrl,
} from "@/lib/request";
import { isProductionServer, isPaidAmount } from "@/lib/tracking-gate";
import { clientConfig } from "@/client.config";
import type {
  ApiErrorResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verifies a Razorpay payment signature and — if the price is non-zero —
 * fires the conversion stack server-side:
 *   - Meta CAPI: BOTH `Purchase` (standard, campaign-optimisation target)
 *     and `sales` (custom, internal source-of-truth count) in a single POST.
 *     Shared event_id = Razorpay payment_id. EMQ payload targets ≥ 9.5.
 *   - Pabbly: CRM webhook for downstream automation (email, sheets).
 *
 * Idempotency: claimEventId(paymentId) guarantees a single fire even when the
 * Razorpay webhook races this route (both use the same event_id).
 */
export async function POST(
  request: Request,
): Promise<NextResponse<VerifyPaymentResponse | ApiErrorResponse>> {
  let body: VerifyPaymentRequest;
  try {
    body = (await request.json()) as VerifyPaymentRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { orderId, paymentId, signature, customer, utm, fbc, fbp, eventSourceUrl } =
    body;

  if (
    !orderId ||
    !paymentId ||
    !signature ||
    !customer ||
    !customer.email ||
    !customer.phone
  ) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
    console.warn(`[verify-payment] signature mismatch for order ${orderId}`);
    return NextResponse.json(
      { success: false, error: "Payment signature verification failed" },
      { status: 400 },
    );
  }

  // event_id = paymentId. Webhook fallback uses the same value so any racing
  // duplicate is dropped by claimEventId().
  const eventId = paymentId;
  const shouldFire = claimEventId(eventId);

  if (shouldFire) {
    const resolvedEventSourceUrl =
      eventSourceUrl ||
      extractEventSourceUrl(request, `https://${clientConfig.brand.domain}/checkout`);
    const clientIp = extractClientIp(request);
    const clientUserAgent = extractUserAgent(request);
    const valueRupees = clientConfig.pricing.price;

    // Two gates protect Pabbly + Meta from test traffic:
    //   1. The request must originate from the production domain (blocks
    //      Vercel preview deploys and localhost).
    //   2. The order amount must exceed ₹1 (blocks ₹1 test transactions).
    const onProductionHost = isProductionServer(request);
    const isRealPurchase = isPaidAmount(valueRupees);
    const shouldReport = onProductionHost && isRealPurchase;

    if (shouldReport) {
      void firePabblyWebhook({
        customer,
        utm: utm ?? {},
        paymentId,
        orderId,
        amount: clientConfig.pricing.pabblyAmountString,
        currency: clientConfig.pricing.currency,
        timezone: clientConfig.event.timezone,
      });

      if (clientConfig.capi.enabled) {
        void fireMetaCapi({
          customer,
          eventNames: ["Purchase", "sales"],
          eventId,
          value: valueRupees,
          currency: clientConfig.pricing.currency,
          paymentId,
          eventSourceUrl: resolvedEventSourceUrl,
          clientIp,
          clientUserAgent,
          fbc,
          fbp,
          testEventCode: process.env.META_CAPI_TEST_EVENT_CODE,
        });
      }
    } else {
      console.log(
        `[verify-payment] tracking suppressed — onProductionHost=${onProductionHost}, isRealPurchase=${isRealPurchase} (value=${valueRupees})`,
      );
    }
  } else {
    console.log(
      `[verify-payment] event_id ${eventId} already claimed — skipping downstream fires (idempotent)`,
    );
  }

  return NextResponse.json({ success: true, paymentId, eventId });
}

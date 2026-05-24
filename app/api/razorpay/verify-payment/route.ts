import { NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { firePabblyWebhook } from "@/lib/pabbly";
import { fireMetaCapi } from "@/lib/capi";
import { claimEventId } from "@/lib/dedup";
import { getPaymentDedupState, markFires } from "@/lib/payment-dedup";
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
 * AWAITS both the Pabbly purchase webhook and the Meta CAPI dual event
 * (Purchase + sales) to completion before responding.
 *
 * Why await: in Vercel's Node.js serverless runtime, when a handler returns
 * a Response, the Lambda instance can be frozen/recycled immediately. Any
 * in-flight `void` promise (a `fetch` that wasn't awaited) gets killed
 * mid-request and silently drops on the floor. Awaiting both fires ensures
 * Vercel keeps the function alive until Pabbly + Meta have both responded.
 * The browser uses `fetch(..., { keepalive: true })` from CheckoutView and
 * doesn't wait for our response, so the extra ~500-1000 ms is invisible to
 * the user.
 *
 * Dedup (two layers):
 *   1. claimEventId(paymentId) — fast in-memory dedup for refresh-retries
 *      within the same Lambda instance.
 *   2. getPaymentDedupState(paymentId) — persistent dedup via the
 *      `pabbly_fired` marker on Razorpay payment notes, shared with the
 *      webhook fallback so the same payment is never reported twice.
 *
 * Mark-after-success: we set `pabbly_fired` only when the Pabbly fire
 * returned true. If Pabbly was down, we deliberately leave the marker
 * unset so the webhook fallback (or backfill script) can retry without
 * being short-circuited.
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

  console.log(
    `[verify-payment] received POST for paymentId=${paymentId} orderId=${orderId} email=${customer.email}`,
  );

  const eventId = paymentId;

  // Layer 1 dedup — in-process. Catches refresh/retry within same Lambda.
  if (!claimEventId(eventId)) {
    console.log(
      `[verify-payment] event_id ${eventId} already claimed in-memory — skipping`,
    );
    return NextResponse.json({ success: true, paymentId, eventId });
  }

  const valueRupees = clientConfig.pricing.price;
  const onProductionHost = isProductionServer(request);
  const isRealPurchase = isPaidAmount(valueRupees);

  // Gate: production domain + amount > ₹1.
  if (!onProductionHost || !isRealPurchase) {
    console.log(
      `[verify-payment] tracking suppressed — onProductionHost=${onProductionHost}, isRealPurchase=${isRealPurchase} (value=${valueRupees})`,
    );
    return NextResponse.json({ success: true, paymentId, eventId });
  }

  // Layer 2 dedup — cross-Lambda via Razorpay payment notes. Catches the
  // verify-payment vs webhook race even when each runs on a different
  // serverless instance. Pabbly + CAPI are tracked SEPARATELY so a
  // partial failure (e.g. Pabbly was down for 5 min) can be retried for
  // just the failed leg, not both.
  const { pabblyFired, capiFired, existingNotes } = await getPaymentDedupState(paymentId);

  if (pabblyFired && capiFired) {
    console.log(
      `[verify-payment] payment ${paymentId} already has BOTH fires marked done — full skip`,
    );
    return NextResponse.json({ success: true, paymentId, eventId });
  }

  const resolvedEventSourceUrl =
    eventSourceUrl ||
    extractEventSourceUrl(request, `https://${clientConfig.brand.domain}/checkout`);
  const clientIp = extractClientIp(request);
  const clientUserAgent = extractUserAgent(request);

  const willFirePabbly = !pabblyFired;
  const willFireCapi = !capiFired && clientConfig.capi.enabled;

  console.log(
    `[verify-payment] event_id=${eventId} value=${valueRupees} email=${customer.email} — firing { pabbly:${willFirePabbly}, capi:${willFireCapi} }`,
  );

  // Fire only what hasn't been done yet. Each gets its own promise so
  // a successful Pabbly + failed CAPI (or vice versa) is recorded correctly.
  const pabblyTask: Promise<boolean> = willFirePabbly
    ? firePabblyWebhook({
        customer,
        utm: utm ?? {},
        paymentId,
        orderId,
        amount: clientConfig.pricing.pabblyAmountString,
        currency: clientConfig.pricing.currency,
        timezone: clientConfig.event.timezone,
      })
    : Promise.resolve(false);

  const capiTask: Promise<boolean> = willFireCapi
    ? fireMetaCapi({
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
      })
    : Promise.resolve(false);

  const [pabblyResult, capiResult] = await Promise.allSettled([pabblyTask, capiTask]);

  if (pabblyResult.status === "rejected") {
    console.error(
      `[verify-payment] Pabbly fire REJECTED for ${paymentId}`,
      pabblyResult.reason,
    );
  }
  if (capiResult.status === "rejected") {
    console.error(
      `[verify-payment] CAPI fire REJECTED for ${paymentId}`,
      capiResult.reason,
    );
  }

  const pabblySucceeded =
    willFirePabbly &&
    pabblyResult.status === "fulfilled" &&
    pabblyResult.value === true;
  const capiSucceeded =
    willFireCapi &&
    capiResult.status === "fulfilled" &&
    capiResult.value === true;

  // Write whichever marker(s) succeeded in a single Razorpay edit. Anything
  // that failed stays unmarked so the fallback path can retry just that leg.
  await markFires(paymentId, existingNotes, { pabblySucceeded, capiSucceeded });

  if (willFirePabbly && !pabblySucceeded) {
    console.warn(
      `[verify-payment] Pabbly fire did NOT succeed for ${paymentId} — leaving pabbly_fired UNSET so the webhook fallback (or backfill script) can retry`,
    );
  }
  if (willFireCapi && !capiSucceeded) {
    console.warn(
      `[verify-payment] CAPI fire did NOT succeed for ${paymentId} — leaving capi_fired UNSET so the webhook fallback can retry`,
    );
  }

  return NextResponse.json({ success: true, paymentId, eventId });
}

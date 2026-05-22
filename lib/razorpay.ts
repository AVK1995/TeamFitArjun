import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";

let cached: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (cached) return cached;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials missing — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in env",
    );
  }
  cached = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return cached;
}

/**
 * Verify Razorpay's HMAC-SHA256 signature for a payment success callback.
 * Razorpay signs the literal string `${orderId}|${paymentId}` with the key secret.
 * Uses timing-safe comparison to defeat side-channel timing attacks.
 */
export function verifyRazorpaySignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  const expected = createHmac("sha256", keySecret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");

  let expectedBuf: Buffer;
  let providedBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expected, "hex");
    providedBuf = Buffer.from(args.signature, "hex");
  } catch {
    return false;
  }

  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Verify Razorpay's webhook X-Razorpay-Signature header.
 * Used by /api/razorpay/webhook as a server-side fallback so CAPI always fires
 * exactly once per successful payment — even if the browser handler died.
 */
export function verifyRazorpayWebhookSignature(args: {
  body: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret).update(args.body).digest("hex");

  let expectedBuf: Buffer;
  let providedBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expected, "hex");
    providedBuf = Buffer.from(args.signature, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

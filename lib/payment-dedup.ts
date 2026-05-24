import { getRazorpay } from "./razorpay";

const MARKER_KEY = "pabbly_fired";

export interface PaymentDedupState {
  /** True when the `pabbly_fired` marker is set on the payment's notes. */
  alreadyFired: boolean;
  /**
   * The payment's current notes, returned so the caller can pass them back
   * into markPaymentFired without a second fetch (preserves any other
   * fields written by future code without overwriting them).
   */
  existingNotes: Record<string, string>;
}

/**
 * Cross-Lambda dedup for the Pabbly purchase fire — persistent and shared
 * across both /api/razorpay/verify-payment and /api/razorpay/webhook.
 *
 * Why this exists separately from lib/dedup.ts:
 *   lib/dedup.ts holds an in-memory `Map<string, number>` that ONLY survives
 *   within a single Vercel Lambda instance. verify-payment and webhook run
 *   as separate serverless functions with separate memory — the lock in one
 *   is invisible to the other. For real cross-route dedup we need a shared
 *   persistent store. Razorpay payment notes are that store: free, already
 *   in our dependency graph, atomic-enough for our 7-fires-per-day volume.
 *
 * Protocol:
 *   1. Caller calls getPaymentDedupState(paymentId).
 *      - If `alreadyFired` → caller returns early (no Pabbly fire).
 *      - Otherwise → caller proceeds to fire Pabbly + CAPI.
 *   2. After a successful Pabbly fire, caller calls markPaymentFired(
 *      paymentId, existingNotes).
 *      - This sets `notes.pabbly_fired = <ms-timestamp>` on the payment.
 *      - Subsequent getPaymentDedupState calls return alreadyFired=true.
 *   3. If the Pabbly fire FAILS (e.g. Pabbly was down for a few minutes),
 *      caller MUST NOT mark — so the fallback path or backfill script can
 *      retry without being short-circuited by a "fired but actually failed"
 *      marker.
 *
 * Race window:
 *   Between getPaymentDedupState() returning false and markPaymentFired()
 *   completing (~500ms during Pabbly POST). If a second caller also runs
 *   getPaymentDedupState() in this window, both will see no marker and both
 *   will fire. In practice the webhook fallback arrives 5–30 s after
 *   verify-payment, so this race rarely materialises. Acceptable trade-off
 *   vs. the only alternative (introducing a Vercel KV / Redis dependency
 *   for an atomic set-if-not-exists).
 *
 * Failure policy:
 *   Razorpay API errors on either fetch or edit are logged and the caller
 *   proceeds with the fire. Better to risk a duplicate row in Pabbly than
 *   silently lose a paid lead.
 */
export async function getPaymentDedupState(
  paymentId: string,
): Promise<PaymentDedupState> {
  try {
    const payment = await getRazorpay().payments.fetch(paymentId);
    const notes = (payment.notes ?? {}) as Record<string, string>;
    const fired = Boolean(notes[MARKER_KEY]);
    if (fired) {
      console.log(
        `[dedup] payment ${paymentId} already marked ${MARKER_KEY}=${notes[MARKER_KEY]}`,
      );
    }
    return { alreadyFired: fired, existingNotes: notes };
  } catch (err) {
    console.warn(
      `[dedup] payments.fetch(${paymentId}) failed — proceeding with fire (better duplicate than miss)`,
      err,
    );
    return { alreadyFired: false, existingNotes: {} };
  }
}

/**
 * Set the `pabbly_fired` marker on the payment's notes. Call this only
 * AFTER firePabblyWebhook returned true.
 */
export async function markPaymentFired(
  paymentId: string,
  existingNotes: Record<string, string>,
): Promise<void> {
  const marker = String(Date.now());
  try {
    await getRazorpay().payments.edit(paymentId, {
      notes: { ...existingNotes, [MARKER_KEY]: marker },
    });
    console.log(`[dedup] marked payment ${paymentId} as ${MARKER_KEY}=${marker}`);
  } catch (err) {
    console.warn(
      `[dedup] could not mark payment ${paymentId} as ${MARKER_KEY} — future calls may duplicate`,
      err,
    );
  }
}

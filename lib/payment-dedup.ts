import { getRazorpay } from "./razorpay";

const PABBLY_MARKER = "pabbly_fired";
const CAPI_MARKER = "capi_fired";

export interface PaymentDedupState {
  /** True when the `pabbly_fired` marker is set on the payment's notes. */
  pabblyFired: boolean;
  /** True when the `capi_fired` marker is set on the payment's notes. */
  capiFired: boolean;
  /**
   * The payment's current notes — returned so the caller can pass them
   * back into markFires() in a single Razorpay edit call without losing
   * any other fields that may exist (or have been written in parallel).
   */
  existingNotes: Record<string, string>;
}

/**
 * Cross-Lambda dedup for the post-purchase fires (Pabbly + Meta CAPI).
 * Persistent across Vercel function instances, regions, and restarts,
 * because the state lives on the Razorpay PAYMENT (not in our memory).
 *
 * Two separate markers, by design:
 *
 *   pabbly_fired — set after firePabblyWebhook() returns true.
 *   capi_fired   — set after fireMetaCapi() returns true.
 *
 * Why two? Because Pabbly and Meta have independent failure modes. If
 * Pabbly is down for 5 minutes but Meta is fine, we want the next route
 * (webhook fallback) to RETRY Pabbly but NOT redo CAPI (Meta dedupes
 * by event_id anyway, but skipping the wasted API call is cleaner). A
 * single combined marker would force "all or nothing" retries.
 *
 * Race window:
 *   Between getPaymentDedupState() returning and markFires() completing
 *   (~500–800ms during the Pabbly+CAPI POSTs). If a second caller runs
 *   getPaymentDedupState() in this window, both will fire. In practice
 *   the webhook fallback arrives 5–30s after verify-payment, so this
 *   race rarely materialises.
 *
 *   Even if it does, Meta CAPI dedupes by event_id (Razorpay payment_id)
 *   within 48h — so duplicate CAPI fires NEVER produce duplicate events
 *   in Events Manager. Only Pabbly is theoretically vulnerable, and the
 *   user can add a payment_id-lookup filter in Pabbly to dedup on that
 *   side if it ever becomes an issue.
 *
 * Failure policy:
 *   On any Razorpay API error during the check, we report both markers
 *   as unset and proceed. Better to risk a duplicate row in Pabbly (which
 *   the caller's Pabbly workflow can dedup) than silently miss a paid
 *   lead from our CRM.
 */
export async function getPaymentDedupState(
  paymentId: string,
): Promise<PaymentDedupState> {
  try {
    const payment = await getRazorpay().payments.fetch(paymentId);
    const notes = (payment.notes ?? {}) as Record<string, string>;
    const pabblyFired = Boolean(notes[PABBLY_MARKER]);
    const capiFired = Boolean(notes[CAPI_MARKER]);
    if (pabblyFired || capiFired) {
      console.log(
        `[dedup] payment ${paymentId} state: pabbly_fired=${notes[PABBLY_MARKER] ?? "—"} capi_fired=${notes[CAPI_MARKER] ?? "—"}`,
      );
    }
    return { pabblyFired, capiFired, existingNotes: notes };
  } catch (err) {
    console.warn(
      `[dedup] payments.fetch(${paymentId}) failed — proceeding with both fires (better duplicate than miss)`,
      err,
    );
    return { pabblyFired: false, capiFired: false, existingNotes: {} };
  }
}

/**
 * Atomically write whichever of {pabbly_fired, capi_fired} succeeded in
 * this run. Single Razorpay edit call so both markers land together
 * (reduces race surface area vs. two sequential edits).
 *
 * Call with `pabblySucceeded: true` only when firePabblyWebhook returned
 * `true` (i.e. Pabbly returned 2xx). Same rule for CAPI. If a fire FAILED
 * we leave its marker unset so the fallback path or backfill script can
 * retry without being short-circuited.
 */
export async function markFires(
  paymentId: string,
  existingNotes: Record<string, string>,
  fired: { pabblySucceeded: boolean; capiSucceeded: boolean },
): Promise<void> {
  if (!fired.pabblySucceeded && !fired.capiSucceeded) {
    // Nothing succeeded — nothing to mark. Leave notes untouched so
    // fallback paths can retry.
    return;
  }

  const ts = String(Date.now());
  const newNotes: Record<string, string> = { ...existingNotes };
  if (fired.pabblySucceeded) newNotes[PABBLY_MARKER] = ts;
  if (fired.capiSucceeded) newNotes[CAPI_MARKER] = ts;

  const summary = [
    fired.pabblySucceeded ? `${PABBLY_MARKER}=${ts}` : null,
    fired.capiSucceeded ? `${CAPI_MARKER}=${ts}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  try {
    await getRazorpay().payments.edit(paymentId, { notes: newNotes });
    console.log(`[dedup] marked payment ${paymentId}: ${summary}`);
  } catch (err) {
    console.warn(
      `[dedup] could not mark payment ${paymentId} (${summary}) — future calls may duplicate`,
      err,
    );
  }
}

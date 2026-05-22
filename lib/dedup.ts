/**
 * In-memory idempotency lock for server-side CAPI fires.
 *
 * Why this exists:
 * - verify-payment can be called twice (browser retry, refresh, double-click).
 * - razorpay webhook can also fire payment.captured after verify-payment.
 * - Without a lock, server CAPI sends 2+ events. Meta dedupes by event_id, but
 *   only within a window and only if the event_id is identical — we still
 *   want to avoid the unnecessary outbound load.
 *
 * Vercel note: this is per-instance, so on cold spread across regions the
 * lock is best-effort. Meta event_id dedup is the real backstop. For
 * absolute idempotency, switch `seen` to a Vercel KV / Upstash Redis call.
 */

const seen = new Map<string, number>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24h — Meta dedups within 48h, this covers it.

function sweep(): void {
  const now = Date.now();
  for (const [key, ts] of seen) {
    if (now - ts > TTL_MS) seen.delete(key);
  }
}

/**
 * Try to claim an event_id. Returns true on first claim, false if already claimed.
 * Callers should only proceed with the side effect (CAPI fire) when true.
 */
export function claimEventId(eventId: string): boolean {
  sweep();
  if (seen.has(eventId)) return false;
  seen.set(eventId, Date.now());
  return true;
}

/** Inspect-only, for tests/diagnostics. */
export function hasClaimed(eventId: string): boolean {
  return seen.has(eventId);
}

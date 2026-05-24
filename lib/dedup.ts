/**
 * IN-PROCESS idempotency lock — useful only WITHIN A SINGLE Vercel Lambda
 * instance. Catches the same paymentId arriving twice on the same warm
 * instance (e.g. a browser refresh that re-fires verify-payment on a
 * recently-used worker).
 *
 * IMPORTANT: this DOES NOT dedup across routes. /api/razorpay/verify-payment
 * and /api/razorpay/webhook run as separate Vercel serverless functions
 * with separate memory — the lock in one is invisible to the other. Even
 * within a single route, Vercel may spin up multiple concurrent Lambda
 * instances under load, each with its own `seen` Map.
 *
 * Real cross-route / cross-instance dedup lives in lib/payment-dedup.ts,
 * which uses Razorpay payment notes as a shared persistent store.
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

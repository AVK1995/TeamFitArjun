/**
 * GA4 event helper — fires `gtag('event', name)` at most ONCE per browser,
 * ever, per event name. Signals we track are reach/intent counts, not raw
 * click counts.
 *
 * Contract (per GA4_Events_Brief_VSL_Funnel v2.0):
 *   - No parameters, no value, no currency. Pure event counts.
 *   - Independent of Meta. This helper never reads from or writes to any
 *     Meta cookie or storage key.
 *   - Stamp the localStorage flag BEFORE calling gtag so a click that
 *     navigates away can't double-fire.
 *   - If gtag is missing (host-gated on non-prod, blocked by an extension,
 *     etc.), DO NOT stamp the flag — otherwise the event is permanently
 *     suppressed for that browser and can never fire on production.
 *   - If localStorage throws (private mode / quota), fire anyway and accept
 *     best-effort dedup.
 *   - All calls wrapped in try/catch — analytics must never surface into a
 *     click handler.
 */

type Ga4Event = "video_play" | "add_to_cart" | "initiate_checkout" | "book_call";

const FLAG_PREFIX = "arjun_ga4_";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackGa4EventOnce(event: Ga4Event): void {
  if (typeof window === "undefined") return;

  if (typeof window.gtag !== "function") {
    return;
  }

  const key = `${FLAG_PREFIX}${event}_fired`;

  try {
    if (window.localStorage.getItem(key) === "1") return;
    window.localStorage.setItem(key, "1");
  } catch {
    // private mode / quota — fall through and fire anyway
  }

  try {
    window.gtag("event", event);
  } catch {
    // never throw into a click handler
  }
}

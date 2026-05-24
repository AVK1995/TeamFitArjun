"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { reapplyMamFromCookie } from "@/lib/analytics";
import { isProductionClient } from "@/lib/tracking-gate";

declare global {
  interface Window {
    /**
     * Most-recent PageView fire — used by the inline script in
     * app/layout.tsx and by this component to dedup against same-pathname
     * fires within a short window (catches React StrictMode double-invoke
     * in dev plus any future accidental duplicate fbq calls).
     */
    __arjun_last_pv?: { pathname: string; at: number };
  }
}

/**
 * Fires `fbq('track', 'PageView')` on every Next.js App Router client-side
 * route change. The inline script in app/layout.tsx handles the initial
 * page load (it runs `afterInteractive`, before this useEffect can confirm
 * fbq is ready); this component covers every subsequent navigation.
 *
 * Before every fire we re-apply MAM from the arjun_mam cookie so the
 * PageView ships with hashed em/ph/fn/ln/ct/country/external_id when the
 * user has filled the checkout form earlier in the session (or on prior
 * visits within the 30-day cookie window).
 *
 * Three layers of double-fire defence:
 *   1. useEffect[pathname] — React only re-runs on actual pathname change.
 *   2. firstRender ref — skips the initial-mount run (the inline script
 *      already fired PageView for the landing pathname).
 *   3. window.__arjun_last_pv token — refuses to fire the same pathname
 *      within 1 second of the previous fire. Belt-and-suspenders against
 *      React StrictMode double-invoke (dev only) and any future code that
 *      accidentally calls window.fbq directly.
 */
export function PixelPageView() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (typeof window === "undefined" || !window.fbq) return;
    if (!isProductionClient()) return;

    const now = Date.now();
    const last = window.__arjun_last_pv;
    if (last && last.pathname === pathname && now - last.at < 1000) {
      console.warn(
        `[pixel] suppressed duplicate PageView for ${pathname} (${now - last.at}ms after previous fire)`,
      );
      return;
    }
    window.__arjun_last_pv = { pathname, at: now };

    reapplyMamFromCookie();
    window.fbq("track", "PageView");
  }, [pathname]);

  return null;
}

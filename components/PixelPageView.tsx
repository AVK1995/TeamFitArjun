"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { reapplyMamFromCookie } from "@/lib/analytics";
import { isProductionClient } from "@/lib/tracking-gate";

/**
 * Fires `fbq('track', 'PageView')` on every Next.js App Router client-side
 * route change. The inline script in app/layout.tsx handles the initial
 * page load (because it runs in `afterInteractive` before any useEffect can
 * confirm fbq is ready); this component covers every subsequent navigation,
 * which the inline script never re-executes.
 *
 * Before every fire we re-apply MAM from the arjun_mam cookie so the
 * PageView ships with hashed em/ph/fn/ln/ct/country/external_id when the
 * user has filled the checkout form earlier in the session (or on prior
 * visits within the 30-day cookie window).
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
    reapplyMamFromCookie();
    window.fbq("track", "PageView");
  }, [pathname]);

  return null;
}

"use client";

import { useEffect } from "react";
import { clientConfig } from "@/client.config";
import { persistUtm, readUtmFromSearch } from "@/lib/utm";

/** Mount-once UTM capture. Reads current URL UTM params + persists with merge. */
export function UtmCapture(): null {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = readUtmFromSearch(window.location.search);
    fromUrl.landing_url = fromUrl.landing_url ?? window.location.href;
    if (document.referrer && !fromUrl.referrer) fromUrl.referrer = document.referrer;
    persistUtm(clientConfig.funnel.sessionStorageKey, fromUrl);
  }, []);
  return null;
}

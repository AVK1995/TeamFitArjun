import type { UtmPayload } from "./types";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "referrer",
  "landing_url",
] as const satisfies readonly (keyof UtmPayload)[];

/** Read UTM + attribution params from a search string. */
export function readUtmFromSearch(search: string): UtmPayload {
  const params = new URLSearchParams(search);
  const out: UtmPayload = {};
  for (const key of UTM_KEYS) {
    const v = params.get(key);
    if (v) out[key] = v;
  }
  return out;
}

/** Read previously persisted UTM payload from sessionStorage. */
export function readUtmFromStorage(storageKey: string): UtmPayload {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as UtmPayload;
    return {};
  } catch {
    return {};
  }
}

/**
 * Persist UTM to sessionStorage. Only overwrites if the incoming payload
 * has at least one defined value — protects against losing first-touch attribution.
 */
export function persistUtm(storageKey: string, utm: UtmPayload): void {
  if (typeof window === "undefined") return;
  const hasAny = Object.values(utm).some((v) => v && v.length > 0);
  if (!hasAny) return;
  try {
    const existing = readUtmFromStorage(storageKey);
    const merged: UtmPayload = { ...existing, ...utm };
    window.sessionStorage.setItem(storageKey, JSON.stringify(merged));
  } catch {
    // private mode / quota — fail silently
  }
}

/** Encode UTM payload as a query string fragment, prefixed with `&`. Empty if nothing. */
export function utmToQueryString(utm: UtmPayload): string {
  const params = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const v = utm[key];
    if (v) params.set(key, v);
  }
  const s = params.toString();
  return s ? `&${s}` : "";
}

/** Read a cookie by name (for _fbp / _fbc lookup on the client). */
export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : undefined;
}

/**
 * Synthesize a Meta `_fbc` value from a `fbclid` URL parameter if the _fbc
 * cookie is missing. Format per Meta spec: `fb.1.{unix_ms}.{fbclid}`.
 * Improves EMQ when the user came from a Facebook click but the pixel cookie
 * hadn't set yet.
 */
export function buildFbcFromFbclid(fbclid: string | undefined): string | undefined {
  if (!fbclid) return undefined;
  return `fb.1.${Date.now()}.${fbclid}`;
}

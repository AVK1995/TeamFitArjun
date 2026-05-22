"use client";

import { isProductionClient } from "./tracking-gate";

/**
 * Client-side Meta Pixel Advanced Matching (MAM) helpers.
 *
 * The funnel ships exactly one browser event — PageView — fired by the inline
 * script in app/layout.tsx. This module is the *identity* side: it SHA-256
 * hashes form values, calls fbq('init', PIXEL_ID, matchingObject) so every
 * subsequent PageView ships hashed em/ph/fn/ln/ct/country/external_id, and
 * persists the hashed values to a first-party cookie so future PageViews
 * (including those on cold returns) carry the same identity.
 *
 * external_id is derived as SHA-256(normalised email). The server CAPI side
 * uses the same derivation — values match across browser and server, which
 * is what Meta's external_id spec requires.
 *
 * Every function in this module is a no-op when the page is NOT served from
 * the production domain — Vercel preview / localhost cannot write the
 * arjun_mam cookie or call fbq.
 */

const MAM_COOKIE_NAME = "arjun_mam";
const MAM_COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60;

type FbqArg = "init" | "track" | "trackCustom" | "consent" | "set";

interface FbqGlobal {
  (action: FbqArg, ...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
}

declare global {
  interface Window {
    fbq?: FbqGlobal;
  }
}

async function sha256Hex(value: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return value;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface MamInput {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
}

async function buildHashedMatching(data: MamInput): Promise<Record<string, string>> {
  const normalised: Record<string, string | undefined> = {};
  if (data.email) normalised.em = data.email.trim().toLowerCase();
  if (data.phone) {
    const digits = data.phone.replace(/\D/g, "");
    if (digits) normalised.ph = digits;
  }
  if (data.firstName) normalised.fn = data.firstName.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (data.lastName) normalised.ln = data.lastName.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (data.city) {
    const ct = data.city.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (ct) normalised.ct = ct;
  }
  if (data.country) {
    const country = data.country.trim().toLowerCase();
    if (country) normalised.country = country;
  }

  const keys = Object.keys(normalised) as Array<keyof typeof normalised>;
  const hashes = await Promise.all(keys.map((k) => sha256Hex(normalised[k] as string)));
  const matching: Record<string, string> = {};
  keys.forEach((k, i) => {
    matching[k as string] = hashes[i];
  });

  if (matching.em) {
    matching.external_id = matching.em;
  }
  return matching;
}

function writeMamCookie(matching: Record<string, string>): void {
  if (typeof document === "undefined") return;
  if (Object.keys(matching).length === 0) return;
  const value = encodeURIComponent(JSON.stringify(matching));
  document.cookie = `${MAM_COOKIE_NAME}=${value}; Path=/; Max-Age=${MAM_COOKIE_TTL_SECONDS}; SameSite=Lax`;
}

export function readMamCookie(): Record<string, string> | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${MAM_COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : null;
  } catch {
    return null;
  }
}

/**
 * Hash the supplied identity, re-init the Pixel with it, and persist to the
 * arjun_mam cookie (30-day TTL). Subsequent PageViews — including on cold
 * returns — inherit the matching object.
 *
 * Call sites:
 *   1. Form-fill useEffect on /checkout (earliest identity moment)
 *   2. Just before router.push from the payment-success handler
 *   3. (Implicit) the inline script in layout.tsx reads the cookie on cold loads
 */
export async function setMetaAdvancedMatching(data: MamInput): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isProductionClient()) return;
  const matching = await buildHashedMatching(data);
  if (Object.keys(matching).length === 0) return;
  writeMamCookie(matching);
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId || !window.fbq) return;
  window.fbq("init", pixelId, matching);
}

/**
 * Re-apply MAM from the persisted cookie. Used on /thank-you mount as a
 * safety net in case the inline layout script raced the route change.
 * fbq('init') with the same matching is idempotent.
 */
export function reapplyMamFromCookie(): void {
  if (typeof window === "undefined" || !window.fbq) return;
  if (!isProductionClient()) return;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return;
  const matching = readMamCookie();
  if (!matching || Object.keys(matching).length === 0) return;
  window.fbq("init", pixelId, matching);
}

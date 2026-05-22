import { createHash } from "node:crypto";

/**
 * SHA-256 hash for Meta CAPI user_data fields.
 * Meta requires PII to be lowercased, trimmed, then SHA-256 hashed (hex).
 * Empty input → empty string (so it can be omitted from the payload).
 */
export function sha256Lower(input: string | undefined | null): string {
  if (!input) return "";
  const normalized = input.trim().toLowerCase();
  if (!normalized) return "";
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Normalize phone for Meta CAPI hashing:
 *  - keep digits only
 *  - country code prefixed, no "+", no spaces, no dashes
 * Example: "+91 98765-43210" → "919876543210"
 */
export function normalizePhoneForCapi(phone: string): string {
  return phone.replace(/\D+/g, "");
}

/**
 * Normalize city for Meta CAPI:
 *  - lowercase
 *  - remove spaces and punctuation
 * Example: "New Delhi" → "newdelhi"
 */
export function normalizeCityForCapi(city: string): string {
  return city.trim().toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Normalize state for Meta CAPI:
 *  - 2-letter abbreviation preferred, lowercased
 *  - if full name provided, lowercase and strip spaces
 * Meta accepts both for India.
 */
export function normalizeStateForCapi(state: string): string {
  return state.trim().toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Normalize ZIP/postal code for Meta CAPI: digits only, lowercased.
 */
export function normalizeZipForCapi(zip: string): string {
  return zip.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Normalize country for Meta CAPI: lowercase ISO-3166-1 alpha-2.
 * "IN" → "in"
 */
export function normalizeCountryForCapi(country: string): string {
  return country.trim().toLowerCase();
}

/**
 * Normalize first/last names for Meta CAPI: lowercase, strip non-letters.
 * "Mr. Rohan" → "rohan"
 */
export function normalizeNameForCapi(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z]/g, "");
}

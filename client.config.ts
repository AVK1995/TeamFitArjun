/**
 * Single source of truth for client-facing values that are inlined at build time.
 * Change here → entire funnel updates after redeploy.
 *
 * NOTE: This client is single-product, no order bumps, no addons. Pricing is flat.
 */

/**
 * Price comes from `NEXT_PUBLIC_PRICE` so it can be tuned in `.env.local` (and
 * Vercel env vars in production) without touching code. NEXT_PUBLIC_ prefix
 * means the value is inlined at build time and available in both the browser
 * (CTA labels, Razorpay modal) and server (create-order, CAPI value, Pabbly).
 * Fallback 97 if unset.
 */
const PRICE_FROM_ENV = (() => {
  const raw = process.env.NEXT_PUBLIC_PRICE;
  if (!raw) return 97;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 97;
})();

/**
 * The struck-through "before" price shown in the checkout special-offer box.
 * DISPLAY ONLY — the amount actually charged is always `pricing.price`. This
 * just drives the "X% OFF" badge and the "you save ₹Y" line. Set via
 * NEXT_PUBLIC_OFFER_ORIGINAL_PRICE so the client can tune it without a code
 * change; falls back to 499.
 */
const OFFER_ORIGINAL_FROM_ENV = (() => {
  const raw = process.env.NEXT_PUBLIC_OFFER_ORIGINAL_PRICE;
  if (!raw) return 999;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 999;
})();

export const clientConfig = {
  brand: {
    name: "TeamFitArjun",
    legalName: "TeamFitArjun",
    coach: "Arjun",
    domain: "teamfitarjun.com",
    productName: "Custom Execution Blueprint Call",
    shortProductName: "Blueprint Call",
    supportEmail: "support@teamfitarjun.com",
    instagramHandle: "thefitarjun",
  },

  pricing: {
    /** Display price in INR (no symbol, no commas). Set via NEXT_PUBLIC_PRICE. */
    price: PRICE_FROM_ENV,
    /** Currency code passed to Razorpay + CAPI */
    currency: "INR" as const,
    /** Amount sent to Pabbly as a string for spreadsheet-friendly format */
    pabblyAmountString: String(PRICE_FROM_ENV),
    /** Razorpay expects amount in paise — derived */
    get paise(): number {
      return this.price * 100;
    },
  },

  /**
   * Checkout special-offer box. Purely presentational urgency — none of this
   * changes what Razorpay charges (`pricing.price`).
   */
  offer: {
    /** Struck-through "before" price. Set via NEXT_PUBLIC_OFFER_ORIGINAL_PRICE. */
    originalPrice: OFFER_ORIGINAL_FROM_ENV,
    /** Static, pre-applied promo code shown as "unlocked". Cosmetic. */
    code: "uwpxkowyzpqx",
    /** Countdown length in minutes; loops back to full on reaching zero. */
    windowMinutes: 15,
  },

  event: {
    timezone: "Asia/Kolkata",
    /** Calendly URL the user is sent to immediately after payment */
    calendlyUrl: "https://calendly.com/thefitarjun/30min",
  },

  funnel: {
    slug: "arjun-blueprint",
    /** sessionStorage key the UTM persistence reads/writes */
    sessionStorageKey: "arjun_utm",
    /** sessionStorage key the customer payload is held under between checkout → thank-you */
    customerStorageKey: "arjun_customer",
    /** sessionStorage key the order info is held under for the thank-you page dedup */
    orderStorageKey: "arjun_order",
  },

  razorpayModal: {
    themeColor: "#9A6614",
    description: "Custom Execution Blueprint Call",
  },

  capi: {
    enabled: true,
    /** Standard Meta event name for purchases */
    eventName: "Purchase",
    /** Server-side Purchase value — auto-tracks the env-driven price */
    purchaseValue: PRICE_FROM_ENV,
    /** Content ID for catalog matching */
    contentId: "arjun-blueprint-call",
    contentName: "Custom Execution Blueprint Call",
    contentCategory: "Fitness Coaching",
    /** Optional Meta Test Event Code — set in env for testing, leave undefined in prod */
  },

  legal: {
    privacyPath: "/privacy-policy",
    termsPath: "/terms-and-conditions",
    refundPath: "/refund-policy",
  },

  analytics: {
    /** Set via env so dev builds don't pollute */
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
    clarityProjectId: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "",
    /**
     * Meta Business Settings → Brand Safety → Domains → teamfitarjun.com → "Add a meta-tag".
     * Rendered into <head> from app/layout.tsx so Meta's crawler can verify the domain.
     * Not a secret — visible in HTML source.
     */
    metaDomainVerification: "cw4qyhsr3cjpqi5yi1rt6p1ruti6pq",
  },
} as const;

export type ClientConfig = typeof clientConfig;

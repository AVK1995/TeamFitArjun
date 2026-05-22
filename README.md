# Arjun Blueprint Funnel

Production Next.js port of the TeamFitArjun "Custom Execution Blueprint Call" funnel.

**Flow:** Landing → Checkout (Razorpay, ₹97) → Book-a-call (Calendly) → Thank-you (Pixel Purchase + quiz). Failures route to Payment-failed with retry + issue-report form.

---

## Why this project exists

Prior client funnels suffered from two recurring problems:

1. **Meta Pixel ↔ CAPI duplication** — purchase counts in Razorpay didn't match Meta's `Purchase` events, breaking attribution.
2. **Low EMQ (Event Match Quality)** scores on Meta CAPI — too little customer identity sent server-side.

This project's architecture solves both:

### Dedup contract
| Where | Event | `event_id` source |
| --- | --- | --- |
| Server CAPI (`/api/razorpay/verify-payment`) | `Purchase` | Razorpay `order_id` |
| Server CAPI (`/api/razorpay/webhook`) — fallback | `Purchase` | Razorpay `order_id` |
| Browser Pixel (`/thank-you`) | `Purchase` | Razorpay `order_id` |

All three share **the same `event_id`**. Meta dedupes within 48 hours on `(event_name, event_id)`. The browser Pixel is **guarded by `sessionStorage[arjun_pixel_purchase_<orderId>]`** so refresh/back never re-fires. The server fires are guarded by an in-memory `claimEventId()` lock.

### EMQ contract (target ≥ 9/10)
Every `Purchase` event ships the following hashed user_data (lowercased + trimmed + SHA-256):

- `em` (email), `ph` (phone digits-only), `fn`, `ln`, `ct` (city), `country` (lowercase ISO-2), `external_id` (= email hash, stable per user)
- Raw: `client_ip_address`, `client_user_agent`, `fbp` cookie, `fbc` cookie (synthesized from `fbclid` if missing)

Add `st` (state) and `zp` (PIN) to the customer payload to push EMQ further.

---

## Tech stack

- Next.js 15 + React 19 + TypeScript
- Razorpay for payments (single product, no order bumps, no add-ons)
- Pabbly Connect for CRM/email automation
- Meta Conversions API (server) + Meta Pixel (browser) — both deduped
- Calendly inline widget for booking
- libphonenumber-js (lazy) for phone normalization

---

## Project layout

```
app/
  layout.tsx                     # Fonts + Pixel/GA scripts, dedup-ready
  globals.css                    # Brand tokens (dark gold over near-black)
  page.tsx                       # Landing
  checkout/page.tsx              # Checkout
  book-a-call/page.tsx           # Post-payment Calendly
  thank-you/page.tsx             # Booking confirmation + Purchase Pixel + quiz
  payment-failed/page.tsx        # Razorpay failure
  privacy-policy/page.tsx        # Legal
  terms-and-conditions/page.tsx
  refund-policy/page.tsx
  api/
    razorpay/create-order/route.ts     # Creates order; returns event_id = order_id
    razorpay/verify-payment/route.ts   # Verifies signature, fires CAPI + Pabbly
    razorpay/webhook/route.ts          # Server fallback (payment.captured)
    lead/route.ts                      # InitiateCheckout / Lead CAPI mirror
    quiz/route.ts                      # Forwards Chhod Yaar diagnostic to Pabbly
    payment-issue/route.ts             # Forwards retry report to Pabbly

components/
  UtmCapture.tsx                 # Mounts on every page, persists UTM + landing_url
  LandingController.tsx          # Rewrites CTAs, fires ViewContent
  CheckoutController.tsx         # Razorpay flow, country picker, validation, coupon
  BookACallController.tsx        # Calendly postMessage → /thank-you redirect
  ThankYouController.tsx         # Pixel Purchase (guarded) + quiz modal
  PaymentFailedController.tsx    # Retry CTA + issue-report form

lib/
  capi.ts                        # Meta CAPI — EMQ-9+ hashed payload
  pixel.ts                       # Browser fbq() wrapper with eventID dedup
  razorpay.ts                    # SDK + signature + webhook signature verify
  pabbly.ts                      # Webhook payload + UTM passthrough
  dedup.ts                       # In-memory claim_event_id lock
  hash.ts                        # SHA-256 + Meta-spec normalizations
  utm.ts                         # sessionStorage UTM + fbc-from-fbclid
  request.ts                     # extract IP/UA/referer for CAPI
  loadSourceHtml.ts              # Loads source-html/*.body.html at build time
  types.ts                       # API contracts

source-html/                     # 1:1 extracted body markup + styles from .txt
client.config.ts                 # Brand, pricing, Calendly URL, EMQ knobs
```

---

## Setup

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.local.example .env.local
# Fill in RAZORPAY_*, PABBLY_WEBHOOK_URL, META_PIXEL_ID, META_CAPI_ACCESS_TOKEN

# 3. Dev
npm run dev

# 4. Production build
npm run build
npm start
```

### Razorpay test mode

Use `rzp_test_*` keys. Test card `4111 1111 1111 1111` with any future expiry, any CVV — payment succeeds.

### Validating Pixel + CAPI dedup

1. In Events Manager → **Test Events**, copy the test event code into `META_CAPI_TEST_EVENT_CODE`.
2. Run a full purchase. In the Test Events feed you should see **one** `Purchase` row with both `Browser` and `Server` sources, marked as **Deduplicated**.
3. Open the browser console; look for `[pixel] Purchase eventID=order_XXX` and `[capi] OK Purchase event_id=order_XXX` — they must match.
4. Refresh `/thank-you` — there should be NO second Pixel fire (sessionStorage guard).

### Validating EMQ score

In Events Manager → **Diagnostics** → your pixel → `Purchase` event row, look for "Event Match Quality". Target ≥ 8.5 (Good) ideally 9+ (Great). If lower:

- Check `client_ip_address` is set (check Vercel headers).
- Add `state` and `zipCode` to the checkout form and to `CustomerPayload`.
- Confirm `_fbp` and `_fbc` cookies are present (Pixel init runs on every page).

---

## Vercel deploy

This project is Vercel-ready out of the box.

1. Push to GitHub
2. Import repo in Vercel
3. Add the env vars from `.env.local.example` (production values)
4. Deploy. Connect your domain.

**Razorpay webhook setup** (do this AFTER you have a deployed URL):

- Razorpay Dashboard → Webhooks → Add Webhook
- URL: `https://YOUR-DOMAIN/api/razorpay/webhook`
- Active events: `payment.captured`, `payment.failed`
- Secret: same value as `RAZORPAY_WEBHOOK_SECRET` in your Vercel env

---

## Editing copy / pricing / Calendly

All single-source-of-truth values live in `client.config.ts`. Change there → redeploy → entire funnel updates. Page markup edits should go in the corresponding `source-html/*.body.html` file.

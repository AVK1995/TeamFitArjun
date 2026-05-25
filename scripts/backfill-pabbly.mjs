#!/usr/bin/env node
/**
 * One-time backfill of Razorpay payments → Pabbly purchase webhook.
 *
 * For paid customers whose data didn't reach Pabbly during a known incident
 * window (e.g. when the webhook fallback was firing with sparse data), this
 * script pulls every captured payment in the given IST date range from
 * Razorpay, reads order notes via `orders.fetch`, and POSTs the same payload
 * shape that `lib/pabbly.ts` would have sent.
 *
 * Usage (from project root):
 *
 *   # DRY RUN — prints what would be sent, no network calls to Pabbly
 *   node scripts/backfill-pabbly.mjs 2026-05-23 2026-05-23
 *
 *   # ACTUALLY SEND
 *   node scripts/backfill-pabbly.mjs 2026-05-23 2026-05-23 --send
 *
 *   # Skip payment IDs you've already manually reconciled in the Sheet
 *   node scripts/backfill-pabbly.mjs 2026-05-23 2026-05-23 --send \
 *     --skip pay_SsoxTwv7VXhM9v,pay_SsoxcXU4snb0KJ
 *
 * Reads RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, PABBLY_WEBHOOK_URL from
 * .env.local in the current directory. No external dependencies — uses
 * the project's existing `razorpay` npm package plus native fetch.
 *
 * IMPORTANT: Razorpay order notes only carry the fields that were captured
 * when the order was created. If a customer paid BEFORE we deployed the
 * enriched-notes change, fbclid / gclid / landing_url / referrer /
 * utm_medium / utm_content / utm_term will be blank in their backfilled
 * Pabbly row — those values are gone (they only ever lived in the browser).
 * first_name, last_name, customer_email, customer_phone, country_code,
 * city, utm_source, utm_campaign are recoverable for any deploy version.
 *
 * MULTI-FUNNEL GUARDRAIL: The Razorpay account this script queries also
 * processes payments for unrelated businesses (WooCommerce, other coaching
 * funnels, etc.). This script ONLY backfills payments stamped with
 * notes.funnel === FUNNEL_SLUG below — any other captured payment in the
 * date range is logged as SKIP-NOT-OURS and never sent to Pabbly. Make
 * sure FUNNEL_SLUG matches what app/api/razorpay/create-order/route.ts
 * stamps (which is clientConfig.funnel.slug in TypeScript).
 */

// Must match clientConfig.funnel.slug in client.config.ts
const FUNNEL_SLUG = "arjun-blueprint";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Razorpay from "razorpay";

// --- Load .env.local into process.env (tiny inline parser, no dotenv dep) ---
function loadEnv() {
  let raw;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  } catch {
    console.error("Could not read .env.local — run this script from the project root.");
    process.exit(1);
  }
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

// --- Parse CLI args ---
const [, , fromArg, toArg, ...rest] = process.argv;
const send = rest.includes("--send");
const skipIdx = rest.indexOf("--skip");
const skipIds =
  skipIdx >= 0 && rest[skipIdx + 1]
    ? new Set(rest[skipIdx + 1].split(",").map((s) => s.trim()))
    : new Set();

if (!fromArg || !toArg) {
  console.error(
    "Usage: node scripts/backfill-pabbly.mjs <YYYY-MM-DD> <YYYY-MM-DD> [--send] [--skip pay_id1,pay_id2]",
  );
  process.exit(1);
}

// --- Resolve env ---
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const pabblyUrl = process.env.PABBLY_WEBHOOK_URL;
if (!keyId || !keySecret) {
  console.error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing in .env.local");
  process.exit(1);
}
if (send && !pabblyUrl) {
  console.error("PABBLY_WEBHOOK_URL missing in .env.local — required when --send is set");
  process.exit(1);
}

// --- Date range: IST midnight to IST 23:59:59 ---
const fromTs = Math.floor(new Date(`${fromArg}T00:00:00.000+05:30`).getTime() / 1000);
const toTs = Math.floor(new Date(`${toArg}T23:59:59.999+05:30`).getTime() / 1000);

if (!Number.isFinite(fromTs) || !Number.isFinite(toTs)) {
  console.error("Invalid date format. Use YYYY-MM-DD (e.g. 2026-05-23).");
  process.exit(1);
}

console.log(
  `Backfill window: ${fromArg} 00:00 IST → ${toArg} 23:59 IST (${fromTs} → ${toTs})`,
);
console.log(`Mode: ${send ? "LIVE — will POST to Pabbly" : "DRY RUN — no network calls to Pabbly"}`);
if (skipIds.size) console.log(`Skipping payment IDs: ${[...skipIds].join(", ")}`);

// --- Initialise Razorpay ---
const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

// --- Fetch all captured payments in window (paginate) ---
const PAGE = 100;
const payments = [];
let skip = 0;
while (true) {
  const page = await razorpay.payments.all({
    from: fromTs,
    to: toTs,
    count: PAGE,
    skip,
  });
  payments.push(...page.items);
  if (page.items.length < PAGE) break;
  skip += PAGE;
}

const captured = payments.filter((p) => p.status === "captured");
console.log(`Fetched ${payments.length} payments (${captured.length} captured).`);

// --- For each, build the same payload lib/pabbly.ts sends ---
let ok = 0;
let fail = 0;
let skippedNotOurs = 0;
for (const p of captured) {
  if (skipIds.has(p.id)) {
    console.log(`SKIP ${p.id} (in --skip list)`);
    continue;
  }

  let notes = {};
  let fetchedNotes = false;
  try {
    const order = await razorpay.orders.fetch(p.order_id);
    notes = order.notes ?? {};
    fetchedNotes = true;
  } catch (err) {
    console.warn(`  orders.fetch(${p.order_id}) failed — building payload from bare payment fields`, err.message);
  }

  // Multi-funnel guardrail — skip payments that didn't originate from our
  // funnel. Without this check, payments from other businesses sharing the
  // same Razorpay account would be replayed into our Pabbly workflow.
  if (fetchedNotes && notes.funnel !== FUNNEL_SLUG) {
    console.log(
      `SKIP-NOT-OURS ${p.id}  notes.funnel=${notes.funnel ?? "<unset>"}  ` +
        `email=${String(p.email ?? "")}  amount=${(p.amount ?? 0) / 100}`,
    );
    skippedNotOurs++;
    continue;
  }
  // If orders.fetch failed entirely (transient Razorpay error), we err on
  // the side of skipping rather than firing — protects against pollution
  // when we can't verify ownership. Re-run the script later if needed.
  if (!fetchedNotes) {
    console.warn(
      `SKIP-NO-NOTES ${p.id}  orders.fetch failed — can't verify funnel ownership, skipping`,
    );
    skippedNotOurs++;
    continue;
  }

  const firstName = notes.first_name ?? "";
  const lastName = notes.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const paid = new Date(p.created_at * 1000);

  const payload = {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    email: String(p.email ?? notes.customer_email ?? ""),
    phone: String(p.contact ?? notes.customer_phone ?? ""),
    city: notes.city ?? "",
    state: "",
    zip_code: "",
    country_code: notes.country_code || "IN",
    payment_id: p.id,
    order_id: p.order_id,
    amount: String((p.amount ?? 0) / 100),
    currency: p.currency,
    coupon: notes.coupon ?? "",
    payment_date: paid.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    payment_time: paid.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    }),
    payment_timestamp: paid.toISOString(),
    utm_source: notes.utm_source ?? "",
    utm_medium: notes.utm_medium ?? "",
    utm_campaign: notes.utm_campaign ?? "",
    utm_content: notes.utm_content ?? "",
    utm_term: notes.utm_term ?? "",
    gclid: notes.gclid ?? "",
    fbclid: notes.fbclid ?? "",
    referrer: notes.referrer ?? "",
    landing_url: notes.landing_url ?? "",
  };

  if (!send) {
    console.log(`\n[DRY-RUN] ${p.id} (${payload.email || payload.phone}):`);
    console.log(JSON.stringify(payload, null, 2));
    continue;
  }

  try {
    const res = await fetch(pabblyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      console.log(`OK   ${p.id}  ${payload.email || payload.phone}  ${payload.full_name}`);
      ok++;
    } else {
      const text = await res.text().catch(() => "");
      console.warn(`FAIL ${p.id}  ${res.status}  ${text.slice(0, 120)}`);
      fail++;
    }
  } catch (err) {
    console.warn(`FAIL ${p.id}  ${err.message}`);
    fail++;
  }
}

const ourFunnelCount = captured.length - skipIds.size - skippedNotOurs;
if (send) {
  console.log(
    `\nDone. OK=${ok}  FAIL=${fail}  SKIPPED-NOT-OURS=${skippedNotOurs}  OUR-FUNNEL=${ourFunnelCount}`,
  );
} else {
  console.log(
    `\nDone (dry run). ${ourFunnelCount} OUR-FUNNEL payments would have been sent, ${skippedNotOurs} skipped as not-ours.`,
  );
  console.log("Re-run with --send to actually fire to Pabbly.");
}

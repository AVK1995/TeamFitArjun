# Lighthouse Performance SOP (Next.js / React)

A reusable playbook for taking a slow page to **90–95+** on Lighthouse, derived from a real
Next.js (App Router) landing-page optimization. Work top-to-bottom; each section lists the
**symptom → cause → fix → how to verify**.

> **Golden rule (read this first):** Never trust Lighthouse numbers from a dev server
> (`next dev`). They are unminified, compiled on demand, and 30–50 points below reality.
> **Always measure a production build** (`next build && next start`) or the deployed URL.
> Most "stuck score" panics are just this.

---

## 0. Set up a valid measurement

```bash
npm run build          # production build (minified, tree-shaken, prerendered)
npm start              # serve it locally  (next start)
# if port is busy:  npx next start -p 3001
```

- Run Lighthouse against the **production** URL, in **Incognito** (extensions skew results).
- Test **both** Mobile and Desktop presets — they throttle differently (mobile = slow 4G + 4× CPU).
- Production-on-localhost still lacks the host's Brotli/CDN/HTTP-2 — the **deployed** site
  (Vercel/Netlify/CDN) will usually score equal or better. Re-measure there for the true number.

---

## 1. Read the report before touching code

Open the audit JSON / UI and note the **failing metric**, then map it to a cause:

| Failing metric | Most common cause |
|---|---|
| **LCP** high (image) | Large/un-optimized hero image, image not preloaded, image is a CSS background |
| **LCP** high but **FCP + Speed Index are good** | A late repaint — usually a **web-font swap** on a big heading, or an element fading in from `opacity:0` |
| **FCP** high | Render-blocking resource: remote CSS `@import`, blocking `<script>`, huge CSS |
| **TBT** high | Heavy/early third-party JS, large hydration, long tasks on main thread |
| **CLS** high | Images without dimensions, fonts without matched fallback metrics, injected banners |
| **"Properly size / efficiently encode / next-gen images"** | Oversized raster assets served raw |

The "fast FCP/SI + slow LCP" pattern is the sneaky one — the page *looks* done early but a later
event (font swap or fade-in) resets the LCP timer. Section 4 fixes it.

---

## 2. Images — usually the #1 win

**Symptom:** Megabytes of PNG/JPEG, "Properly size images" / "Serve images in next-gen formats".

**Cause:** Assets are 2–5× larger in pixels than their display size and stored as heavy
PNG/JPEG, served raw (no build-time optimization).

**Fix A — Compress every page-loaded image (biggest, lowest-risk lever).**
Downscale to ~2× the display size and re-encode. A one-off Node script with `sharp`:

```js
// optimize-images.mjs  — run once with: node optimize-images.mjs
import sharp from "sharp";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve("public");
const CAP = 1000;            // max width in px (tune per asset class)
const SKIP = ["og images", "favicon"]; // social/meta assets keep exact dims

async function walk(d, acc = []) {
  for (const e of await readdir(d, { withFileTypes: true }))
    e.isDirectory() ? await walk(path.join(d, e.name), acc) : acc.push(path.join(d, e.name));
  return acc;
}
for (const f of await walk(DIR)) {
  const ext = path.extname(f).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) continue;
  if (SKIP.some((s) => f.toLowerCase().includes(s))) continue;
  const input = await readFile(f);
  let p = sharp(input).rotate();
  const m = await sharp(input).metadata();
  if (m.width > CAP) p = p.resize({ width: CAP, withoutEnlargement: true });
  p = ext === ".png"
    ? p.png({ compressionLevel: 9, palette: true, quality: 82, effort: 8 })
    : p.jpeg({ quality: 74, mozjpeg: true, progressive: true });
  const out = await p.toBuffer();
  if (out.length < input.length) await writeFile(f, out); // only if smaller
}
```

- **Keep the same filename + format** → zero code/reference changes, works on every page.
- Real result on the source project: **~30 MB → ~7 MB**; 1 MB carousel JPEGs → ~50 KB each.
- Delete the script afterward (it's a one-off).

**Fix B — Next-gen format for the LCP image.** Convert the hero/LCP image to **WebP/AVIF**
(typically 3–5× smaller than PNG) and update its single reference:

```js
await sharp("public/hero.png").resize({ width: 900 }).webp({ quality: 80 }).toFile("public/hero.webp");
```

**Fix C — Prefer `next/image`** for new work: automatic responsive sizing, AVIF/WebP, lazy
loading, and `priority` for the LCP. (Retrofitting many raw `<img>` tags is higher-risk, so
on existing pages, Fix A + B often gets you there without structural change.)

**Verify:** `du -sh public` before/after; Lighthouse image audits turn green.

---

## 3. Fonts — kill render-blocking + duplicate loads

**Symptom:** "Eliminate render-blocking resources" pointing at `fonts.googleapis.com`; or a slow
LCP caused by a heading repainting when the web font swaps in.

**Cause 1 — Remote CSS `@import` (worst offender).**
```css
@import url('https://fonts.googleapis.com/css2?family=...');  /* render-blocking + cross-origin */
```
A remote `@import` blocks rendering: the browser must open new connections to
`fonts.googleapis.com` + `fonts.gstatic.com` and fetch the stylesheet **before painting**. It's
also often a **duplicate** of fonts you already load elsewhere.

**Fix:** Delete every remote font `@import` from CSS. Self-host via the framework's font system
(`next/font`), which serves fonts **same-origin, preloaded, and non-render-blocking**:

```ts
import { Playfair_Display, Inter } from "next/font/google";
const heading = Playfair_Display({ subsets: ["latin"], weight: ["400","500","600","700","800"], display: "swap", variable: "--fh" });
const body    = Inter({ subsets: ["latin"], weight: ["400","500","600","700"], display: "swap", variable: "--fb" });
// apply heading.variable + body.variable on <html>
```

- **Cover every weight your CSS actually uses** (grep `font-weight:` across the codebase) so
  removing the `@import` causes **no visual change**.
- `display: "swap"` + the framework's matched fallback metrics keep CLS ~0 during the swap.
- Fewer weights = fewer files = the critical heading weight swaps in sooner (helps LCP). Trim
  weights you don't use — but don't drop ones that are used, or headings shift weight.

**Gotcha:** check **all** route stylesheets, not just the one you measured. The same `@import`
often appears in every page's CSS file.

**Verify:** Lighthouse "render-blocking resources" no longer lists Google Fonts; network panel
shows fonts served from your own origin.

---

## 4. LCP element — make it paint immediately

**Symptom:** Good FCP/Speed Index but LCP is seconds later.

**Cause:** The largest element (hero image or big heading) is **hidden then revealed** —
typically an entrance animation starting at `opacity:0`, or a CSS-background image discovered
late. The browser doesn't record LCP until the element is actually visible.

**Fixes:**
1. **Don't start the above-the-fold/LCP element at `opacity:0`.** Scroll-reveal animations are
   great below the fold, but the first viewport should paint instantly:
   ```css
   /* hero is above the fold — render immediately, never delay LCP */
   .hero [data-reveal]{ opacity:1 !important; transform:none !important; animation:none !important; }
   ```
   Keep the reveal animation for below-the-fold sections.
2. **Preload the LCP image** at high priority (especially CSS-background images, which are
   discovered late):
   ```tsx
   <link rel="preload" as="image" href="/hero.webp" fetchPriority="high" />
   ```
3. **Avoid font-swap LCP** on big headings — see Section 3 (self-host + cover the heading weight).
4. If the LCP is an image, make it an eager, high-priority `<img>` / `next/image priority`
   rather than a lazy or background image.

**Verify:** Lighthouse "Largest Contentful Paint element" + LCP timing under 2.5 s.

---

## 5. Third-party & app scripts — protect TBT/FCP

**Symptom:** High TBT / "Reduce JavaScript execution time" / "Minimize main-thread work".

**Cause:** Analytics, chat, payment, or pixel scripts loading too early and blocking the main
thread; large client-component hydration.

**Fix — choose the right loading strategy** (Next.js `<Script>`):

| Strategy | Use for |
|---|---|
| `beforeInteractive` | Almost never (only consent/anti-flicker that MUST run first) |
| `afterInteractive` | Analytics that must fire on load (GA, Meta Pixel init) |
| `lazyOnload` | Non-critical SDKs (chat, payment checkout libs) — load when idle |

- **Lazy-load payment/checkout SDKs** (`lazyOnload`) — they aren't needed for first paint.
- **Facade pattern for embeds:** don't load a YouTube/Vimeo iframe on page load — show a
  thumbnail + play button and only mount the iframe on click. (Big TBT/LCP saver.)
- Keep on-mount work in client components trivial (no heavy synchronous parsing).
- ⚠️ **Never break analytics/pixel/UTM behavior for performance** — change *when* they load, not
  *what* they do.

**Verify:** TBT drops; "reduce third-party impact" shrinks.

---

## 6. Lazy-load below-the-fold media

**Fix:** Add to every below-the-fold `<img>` (or `<iframe>`):
```html
<img src="..." loading="lazy" decoding="async" />
```
- Stops off-screen images from competing with the LCP for bandwidth.
- Leave the **LCP / above-fold image eager** (never `loading="lazy"` on it).

---

## 7. CLS — stop layout jumps

- Always set width/height (or aspect-ratio) on images/video so space is reserved.
- Use `display: swap` **with matched fallback metrics** (framework font loaders do this) so the
  font swap doesn't reflow.
- Reserve space for late-injected UI (banners, sticky bars).

---

## Final verification checklist

- [ ] Measured on a **production build** (`next build && next start`) or deployed URL — not `next dev`.
- [ ] Tested **both** Mobile and Desktop presets, in Incognito.
- [ ] No remote font `@import` anywhere; fonts self-hosted, all used weights present.
- [ ] LCP image optimized (next-gen format, sized), **preloaded**, and **not** hidden by an
      `opacity:0` reveal.
- [ ] Below-the-fold images `loading="lazy" decoding="async"`; LCP image stays eager.
- [ ] Heavy/3rd-party scripts deferred (`afterInteractive`/`lazyOnload`); embeds use a facade.
- [ ] Analytics / pixel / UTM behavior unchanged (only load timing touched).
- [ ] `du -sh public` confirms a large asset-weight reduction.
- [ ] Re-measured on the deployed (CDN/Brotli/HTTP-2) environment for the real score.

---

## One-line mental model

> **Measure production. Shrink the bytes (images + fonts). Make the LCP element paint first
> (optimize it, preload it, don't fade it in). Defer everything non-critical. Don't change what
> analytics do — only when they load.**

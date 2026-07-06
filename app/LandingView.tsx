"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clientConfig } from "@/client.config";
import { readUtmFromStorage, utmToQueryString } from "@/lib/utm";

// Same VSL (cold v3) + thumbnail as the current landing page.
const HERO_VIDEO_URL =
  "https://tgox-production-bucket.nyc3.cdn.digitaloceanspaces.com/client_funnel_videos/Arjun/arjun_final_vsl.mp4_v1%20(1080p).mp4";
const HERO_THUMB_URL = "/Landing%20Thumbnail.webp";

interface Slide {
  src: string;
  alt: string;
}

const ROW_1: Slide[] = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ({
    src: `/transformations/top%206%20carousel%201/${n}.jpg.jpeg`,
    alt: `Featured Transformation ${String(n).padStart(2, "0")}`,
  })),
  ...[10, 15, 16, 30, 1, 2, 3, 5, 6, 7, 8, 9, 11, 12, 13, 14, 17, 18, 19, 20, 21, 22, 25, 27, 29].map((n) => ({
    src: `/transformations/a-${n}.png`,
    alt: `Transformation ${String(n).padStart(2, "0")}`,
  })),
];

const ROW_2: Slide[] = [
  ...[7, 8, 9, 10, 11, 12].map((n) => ({
    src: `/transformations/top%206%20carousel%202/${n}.jpg.jpeg`,
    alt: `Featured Transformation ${String(n).padStart(2, "0")}`,
  })),
  ...[38, 42, 32, 34, 35, 36, 37, 40, 43, 44, 45, 46, 47, 48].map((n) => ({
    src: `/transformations/a-${n}.png`,
    alt: `Transformation ${String(n).padStart(2, "0")}`,
  })),
];

const TESTIMONIALS = [
  {
    name: "Ankush Ramnani",
    meta: "23 · Australia",
    before: "/Ankush%20Ramnani%20Before.png",
    after: "/Ankush%20Ramnani%20after.png",
    quote:
      "Stuck skinny-fat despite extreme work hours and failed attempts. Ankush followed a fully customized system built by Arjun that adapted even through surgery, ultimately achieving a shredded six-pack physique with full control over his body.",
    delay: undefined,
  },
  {
    name: "Amritangshu Mahapatra",
    meta: "29 · Bhubaneswar",
    before: "/Amritangshu%20before.png",
    after: "/Amritangshu%20after.png",
    quote:
      "Despite training hard, Amritangshu lacked structure until Arjun aligned his diet, training and recovery with his lifestyle, making him leaner, stronger, and finally in complete control.",
    delay: ".08s",
  },
  {
    name: "Manish",
    meta: "34 · Pune",
    before: "/Manish%20before.png",
    after: "/Manish%20after.png",
    quote:
      "Struggling with stress, thyroid fluctuations and life disruptions, Manish followed a flexible system designed by Arjun that sustained consistency, helping him reach photoshoot-level conditioning with confidence.",
    delay: ".16s",
  },
  {
    name: "Rohan Mehra",
    meta: "Toronto, Canada",
    before: "/Rohan%20before.png",
    after: "/Rohan%20after.png",
    quote:
      "After 10 years of ineffective workouts, Rohan followed Arjun's structured approach to nutrition, tracking and accountability, finally achieving a lean physique with visible abs that he maintains long-term.",
    delay: ".24s",
  },
];

// ── Performance Review ledger rows ──────────────────────────────────────────
const REVIEW_WIN = [
  "Handles pressure, deadlines, people",
  "Solves problems others can't",
  "Income growing year on year",
  "Follows through on commitments",
  "Respected in his field",
];
const REVIEW_FAIL = [
  "Gym plan survives a bad week",
  "Diet survives travel and dinners",
  "Shirt off at the pool, no hesitation",
  "Energy steady past 4 PM",
  "Body matches the position",
];

// ── Qualification lists ─────────────────────────────────────────────────────
const APPLY = [
  "You earn ₹25+ lakhs per annum",
  "You're a senior professional or business owner who knows quality costs money",
  "You've done well in every area of life except this one",
  "You've tried coaches, apps, or plans before and the result didn't stick",
  "Your weeks are unpredictable: travel, dinners, late calls",
  "You're ready to follow a structured system built around your real life",
  "You want this handled in the next 6 to 12 months, not someday",
];
const NOT_APPLY = [
  "You earn less than ₹25 lakhs per annum",
  "You're looking for a ₹4,000 to ₹5,000 plan to fix a 10-year pattern",
  "You want a PDF and zero accountability",
  "You're expecting a quick fix, a fat burner, or a shortcut",
  "You blame time, age, or genetics and want a coach who agrees with you",
  "You're not financially ready to invest in coaching beyond this call",
];

// ── Blueprint call breakdown ────────────────────────────────────────────────
const CALL_STEPS = [
  {
    time: "0–10 min",
    title: "Diagnosis",
    desc: "Arjun maps your history: what you've tried, where each attempt broke, and what your actual weeks look like. You'll probably hear your own pattern named more precisely than you ever have.",
  },
  {
    time: "10–22 min",
    title: "Your Custom Execution Blueprint",
    desc: "He builds the outline of a plan around your reality: your travel, your work hours, your food environment. You leave knowing exactly what your version of this looks like.",
  },
  {
    time: "22–30 min",
    title: "Fit decision, both ways",
    desc: "If Arjun believes coaching will get you the result, he'll tell you what working together looks like and what it costs. If he doesn't, he'll tell you that too. No pressure tactics, ever.",
  },
];

const FAQS = [
  {
    q: "Is this going to be another generic program with a new label on it?",
    a: "No, and you'll be able to verify that on the call itself. The first 10 minutes are Arjun diagnosing your specific history and week structure. If what he says sounds like it could apply to anyone, invoke the refund. That's what it's there for.",
  },
  {
    q: "What if I sign up for coaching and Arjun disappears like my last coach did?",
    a: "Direct access to Arjun is the product, not a bonus. No assistant replies, no 48-hour delays. It's also why his client capacity is capped and why this page filters as hard as it does.",
  },
  {
    q: "I travel 10 to 15 days a month. Will this even work for my life?",
    a: "Travel-heavy professionals are the exact profile this methodology was built around. The Blueprint is designed from your worst weeks backwards, not your best weeks forwards. Bring your real calendar to the call.",
  },
  {
    q: `Is the ₹${clientConfig.pricing.price} call a setup for a high-pressure sales pitch?`,
    a: 'The program is offered on the call only if Arjun believes it fits, and the price is stated plainly, once. No countdown, no "only 2 spots left", no discount games. If you ever feel pressured, use the refund. His brand runs on the opposite of pressure.',
  },
  {
    q: "How fast will I see results if I join the program?",
    a: "Honest timeline: around 12 weeks for a visible shift, 8 to 12 months for full conditioning if you're starting at 95 kg or above. Anyone promising faster is selling you the cycle you've already lived through.",
  },
];

export function LandingView() {
  const [openFaq, setOpenFaq] = useState(0);
  const [stickyOn, setStickyOn] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [lightbox, setLightbox] = useState<{ slides: Slide[]; index: number } | null>(null);
  const [timerLabel, setTimerLabel] = useState("15:00");
  const [checkoutHref, setCheckoutHref] = useState("/checkout");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const utm = readUtmFromStorage(clientConfig.funnel.sessionStorageKey);
    const qs = utmToQueryString(utm);
    setCheckoutHref(`/checkout?from=landing${qs}`);

    const hero = document.querySelector<HTMLElement>(".af-hero");
    const onScroll = () => {
      if (hero) setStickyOn(hero.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const DURATION = 15 * 60 * 1000;
    const STORAGE_KEY = "arjun_countdown_started";
    let started: number;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      started = raw ? parseInt(raw, 10) : Date.now();
      if (!raw) window.sessionStorage.setItem(STORAGE_KEY, String(started));
    } catch {
      started = Date.now();
    }
    function tick() {
      let remaining = started + DURATION - Date.now();
      if (remaining <= 0) {
        const elapsed = Date.now() - started;
        const cyclesCompleted = Math.max(1, Math.floor(elapsed / DURATION));
        started = started + cyclesCompleted * DURATION;
        try {
          window.sessionStorage.setItem(STORAGE_KEY, String(started));
        } catch {
          // sessionStorage unavailable — ignore
        }
        remaining = started + DURATION - Date.now();
      }
      const totalSec = Math.floor(remaining / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      setTimerLabel(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }
    tick();
    const tickId = window.setInterval(tick, 1000);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearInterval(tickId);
    };
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowLeft") nav(-1);
      else if (e.key === "ArrowRight") nav(1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  function nav(delta: number) {
    setLightbox((prev) => {
      if (!prev) return prev;
      const n = prev.slides.length;
      return { ...prev, index: (prev.index + delta + n) % n };
    });
  }

  const price = clientConfig.pricing.price;

  return (
    <div
      className="af-root"
      style={{
        display: "block",
        width: "100%",
        background: "#0E0C09",
        color: "#F1E5D0",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Announcement marquee */}
      <div className="af-announce" style={{ background: "#000", overflow: "hidden" }}>
        <div className="af-announce-track">
          {Array.from({ length: 2 }).map((_, dup) => (
            <span key={dup} style={{ display: "contents" }}>
              <span><b>1,500+</b> Clients Coached In 5 Years</span><span className="dot" />
              <span><b>₹25L+ / year</b> Minimum Income</span><span className="dot" />
              <span>Featured: Aaj Tak · Zee News · HealthXP</span><span className="dot" />
              <span>India · UK · Canada · Australia · UAE</span><span className="dot" />
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="af-header">
        <div className="af-wrap">
          <Link href="/" className="af-logo" aria-label="Team Fit Arjun — home">
            <span id="af-logo-mark" className="af-logo-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Site%20main%20logo.png" alt="TFA" className="af-logo-img" />
            </span>
          </Link>
        </div>
      </header>

      {/* A · Hero */}
      <section className="af-hero" style={{ background: "#0E0C09" }}>
        <div className="af-wrap af-hero-inner">
          <div className="af-callout" data-af-reveal>
            For Senior Professionals &amp; Business Owners, 30 to 45
          </div>

          <h1 className="af-h1" data-af-reveal style={{ "--d": ".06s" } as React.CSSProperties}>
            You Perform At A High Level In Every Room You Walk Into.{" "}
            <span className="af-accent">Your Body Is The One Thing That Doesn&rsquo;t Show It.</span>
          </h1>

          <p className="af-sub" data-af-reveal style={{ "--d": ".14s" } as React.CSSProperties}>
            If you earn <strong>₹25+ lakhs a year</strong> but still hesitate before taking your shirt
            off at the pool, the next 7 minutes will explain why. Effort was never your problem &mdash;
            Arjun shows you the one pattern that has quietly broken every attempt you&rsquo;ve made.
          </p>

          <div className="af-video-frame" data-af-reveal style={{ "--d": ".22s" } as React.CSSProperties}>
            <div
              className={`af-video ${videoPlaying ? "playing" : ""}`}
              id="af-vsl"
              role="button"
              aria-label="Play video"
              onClick={() => !videoPlaying && setVideoPlaying(true)}
            >
              <div
                className={`af-video-thumb ${videoPlaying ? "" : "on"}`}
                id="af-vthumb"
                style={{
                  backgroundImage: `url("${HERO_THUMB_URL}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />
              {!videoPlaying ? (
                <div className="af-play">
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              ) : (
                <video
                  src={HERO_VIDEO_URL}
                  autoPlay
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                    zIndex: 5,
                    objectFit: "cover",
                    background: "#000",
                  }}
                />
              )}
            </div>
          </div>

          <CtaBlock checkoutHref={checkoutHref} timerLabel={timerLabel} delay=".3s" extraStyle={{ marginTop: 8 }} />
        </div>
      </section>

      {/* E · Qualification */}
      <section className="af-two nf-qual" style={{ background: "#1A1611" }}>
        <div className="af-wrap">
          <h2 data-af-reveal>
            This Call Is <span className="af-accent">Not For Everyone</span>
          </h2>
          <div className="nf-qual-grid" data-af-reveal style={{ "--d": ".08s" } as React.CSSProperties}>
            <div className="nf-qual-col nf-qual-yes">
              <div className="nf-qual-h">Apply if this is you</div>
              <ul>{APPLY.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="nf-qual-col nf-qual-no">
              <div className="nf-qual-h">Do not apply if this is you</div>
              <ul>{NOT_APPLY.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
          <p className="nf-income-note" data-af-reveal style={{ "--d": ".12s" } as React.CSSProperties}>
            If you earn less than ₹25 lakhs per annum, respectfully, this call is not built for you yet.
            Keep following the free content &mdash; it will get you moving. Arjun takes every Blueprint
            Call personally, which caps his calendar each week, and those slots are held for men ready to
            invest in premium coaching.
          </p>
          <CtaBlock
            checkoutHref={checkoutHref}
            timerLabel={timerLabel}
            shortLabel
            wrapperClass="af-cta-block af-two-cta"
            extraStyle={{ marginTop: 36 }}
          />
        </div>
      </section>

      {/* D · Proof */}
      <section className="af-proof" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <h2 data-af-reveal>
            Men Like You. Same Calendar. <em>Different Body.</em>
          </h2>
          <div className="af-tcards">
            {TESTIMONIALS.map((t) => (
              <article
                key={t.name}
                className="af-tcard"
                data-af-reveal
                style={t.delay ? ({ "--d": t.delay } as React.CSSProperties) : undefined}
              >
                <div className="af-tphoto">
                  <div className="tside b">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.before} alt={`${t.name.split(" ")[0]} before`} loading="lazy" decoding="async" />
                    <div><BeforeAfterSvg /><br />Before</div>
                  </div>
                  <div className="tside a">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.after} alt={`${t.name.split(" ")[0]} after`} loading="lazy" decoding="async" />
                    <div><BeforeAfterSvg /><br />After</div>
                  </div>
                  <div className="vline" />
                  <span className="tag tb">Before</span>
                  <span className="tag ta">After</span>
                </div>
                <div className="af-tcard-body">
                  <h4>{t.name}</h4>
                  <div className="meta">{t.meta}</div>
                  <div className="stars">★★★★★</div>
                  <p>{t.quote}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Credibility strip */}
      <section className="af-creds" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <div className="af-creds-grid" data-af-reveal>
            <div className="af-cred-item">
              <div className="af-cred-num">1,500+</div>
              <div className="af-cred-label">Clients Coached</div>
              <div className="af-cred-sub">Globally in 5 Years</div>
            </div>
            <div className="af-cred-item">
              <div className="af-cred-num">₹25L+</div>
              <div className="af-cred-label">Minimum Income</div>
              <div className="af-cred-sub">Per Year, Per Client</div>
            </div>
            <div className="af-cred-item">
              <div className="af-cred-num">On Air</div>
              <div className="af-cred-label af-cred-text">Aaj Tak · Zee News</div>
              <div className="af-cred-sub">HealthXP Featured Coach</div>
            </div>
          </div>
        </div>
      </section>

      {/* B · Performance Review ledger — HIDDEN per request. Uses `false &&` so
          the JSX (and REVIEW_WIN/REVIEW_FAIL) stays valid; flip to re-enable. */}
      {false && (
        <section className="af-proof nf-review" style={{ background: "#0E0C09" }}>
          <div className="af-wrap">
            <h2 data-af-reveal>
              If Your Body Got The Same Review <span className="af-accent">Your Work Gets</span>
            </h2>
            <p className="nf-lede" data-af-reveal style={{ "--d": ".06s" } as React.CSSProperties}>
              Run the audit you run on everything else. Be honest &mdash; nobody sees this except you.
            </p>
            <div className="nf-review-grid" data-af-reveal style={{ "--d": ".1s" } as React.CSSProperties}>
              <div className="nf-col nf-col-win">
                <div className="nf-col-h">Career &amp; Life</div>
                {REVIEW_WIN.map((row) => (
                  <div className="nf-row" key={row}>
                    <span>{row}</span>
                    <span className="nf-verdict nf-pass">Exceeds</span>
                  </div>
                ))}
              </div>
              <div className="nf-col nf-col-fail">
                <div className="nf-col-h">Body &amp; Health</div>
                {REVIEW_FAIL.map((row) => (
                  <div className="nf-row" key={row}>
                    <span>{row}</span>
                    <span className="nf-verdict nf-fail">Fails</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="nf-verdict-line" data-af-reveal style={{ "--d": ".14s" } as React.CSSProperties}>
              Same man. Same discipline. Same brain. So the problem was never you. It&rsquo;s the one
              moment your plan never accounted for.
            </p>
          </div>
        </section>
      )}

      {/* Carousel gallery */}
      <section className="af-gallery" style={{ background: "#1A1611", overflow: "hidden" }}>
        <div className="af-wrap">
          <h2 data-af-reveal style={{ marginBottom: 36 }}>
            Before &amp; After <span>Transformations</span>
          </h2>
        </div>
        <CarouselRow
          id="af-gal-carousel-1"
          trackId="af-gal-track-1"
          setId="af-gal-set-1"
          direction="ltr"
          slides={ROW_1}
          onSlideClick={(i) => setLightbox({ slides: ROW_1, index: i })}
        />
        <CarouselRow
          id="af-gal-carousel-2"
          trackId="af-gal-track-2"
          setId="af-gal-set-2"
          direction="rtl"
          extraClass="af-gal-carousel-row2"
          slides={ROW_2}
          onSlideClick={(i) => setLightbox({ slides: ROW_2, index: i })}
        />
        <div className="af-wrap" />
      </section>

      {/* C · Mechanism — the Chhod Yaar moment */}
      <section className="af-final nf-mech" style={{ background: "#0E0C09" }}>
        <div className="af-wrap af-final-inner">
          <h2 data-af-reveal>Every Plan You&rsquo;ve Followed Worked In A Calm Week.</h2>
          <p data-af-reveal style={{ "--d": ".08s" } as React.CSSProperties}>
            Then came the client escalation, the late flight, the wedding weekend. And in one tired
            moment, a voice you know very well said:
          </p>
          <p className="nf-quote" data-af-reveal style={{ "--d": ".14s" } as React.CSSProperties}>
            <em>&ldquo;Chhod yaar, kal karunga.&rdquo; And tomorrow never came. Again.</em>
          </p>
          <p data-af-reveal style={{ "--d": ".2s" } as React.CSSProperties}>
            That moment is the actual problem. Not your effort. Not your knowledge. You already know
            more about protein and calories than most trainers. What you&rsquo;ve never had is a system
            built for the weeks when your life gets loud.
          </p>
          <p data-af-reveal style={{ "--d": ".26s" } as React.CSSProperties}>
            Arjun&rsquo;s methodology is built on <strong>Decision Removal</strong>. The plan is designed
            around your travel, your dinners, your worst weeks &mdash; so when the Chhod Yaar moment
            arrives, there is no decision left to break. That&rsquo;s what 1,500 men before you actually
            paid for. Not a diet &mdash; the removal of the moment that kills the diet. How that works for
            your specific life is what the Blueprint Call maps out.
          </p>
          <CtaBlock checkoutHref={checkoutHref} timerLabel={timerLabel} shortLabel delay=".3s" />
        </div>
      </section>

      {/* F · What happens on the Blueprint Call */}
      <section className="af-skim nf-call" style={{ background: "#1A1611" }}>
        <div className="af-wrap">
          <div className="af-skim-head">
            <h2 data-af-reveal>
              What Happens On The <span className="af-accent">Blueprint Call</span>
            </h2>
            <p data-af-reveal style={{ "--d": ".06s" } as React.CSSProperties}>
              30 minutes. 1 on 1 with Arjun. Not his team, not an assistant. Him.
            </p>
          </div>
          <div className="nf-timeline">
            {CALL_STEPS.map((s, i) => (
              <div
                className="nf-step"
                key={s.time}
                data-af-reveal
                style={{ "--d": `${0.08 + i * 0.06}s` } as React.CSSProperties}
              >
                <div className="nf-step-time">{s.time}</div>
                <div className="nf-step-body">
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="af-skim-cta">
            <CtaBlock checkoutHref={checkoutHref} timerLabel={timerLabel} shortLabel />
          </div>
        </div>
      </section>

      {/* Read this before you pay */}
      <section className="af-money nf-read" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <h2 data-af-reveal style={{ textAlign: "center" }}>
            Read This Before You Pay. <span className="af-accent">It Matters.</span>
          </h2>
          <div className="nf-read-grid" data-af-reveal style={{ "--d": ".08s" } as React.CSSProperties}>
            <div className="nf-read-item">
              <strong>This call is not a free diet and workout plan.</strong>
              <p>
                Nobody can give you a serious plan in 30 minutes without knowing your life first.
                That&rsquo;s exactly the generic-coach behaviour that failed you before.
              </p>
            </div>
            <div className="nf-read-item">
              <strong>₹{price} covers the consultation only.</strong>
              <p>
                The coaching program is a separate investment, discussed on the call based on your goals
                and your starting point.
              </p>
            </div>
            <div className="nf-read-item">
              <strong>The call is honest in both directions.</strong>
              <p>Arjun turns people away when the fit isn&rsquo;t right. Your money back applies either way.</p>
            </div>
          </div>
        </div>
      </section>

      {/* G · About Arjun */}
      <section className="af-about" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <div className="af-about-grid">
            <div className="af-about-photo" data-af-reveal style={{ position: "relative" }}>
              <span className="badge">Meet Your Coach</span>
              <div className="frame" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Meet%20Your%20Coach%20Arjun.png"
                alt="Arjun Shah"
                loading="lazy"
                decoding="async"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div className="count">
                <div><b>104→65</b><span>His Own Kg</span></div>
                <div><b>1,500+</b><span>Clients</span></div>
              </div>
            </div>
            <div className="af-about-text" data-af-reveal style={{ "--d": ".12s" } as React.CSSProperties}>
              <h2>The Coach Who&rsquo;s <span>Lived Both Sides</span></h2>
              <p>
                Arjun Shah spent years at <strong>104 kg</strong> before engineering himself down to{" "}
                <strong>65</strong>. Not with motivation &mdash; with a system that survived his own bad weeks.
              </p>
              <p>
                Over the last <strong>5 years</strong> he&rsquo;s coached more than <strong>1,500 clients</strong>{" "}
                across India, the US, UK, Canada, Australia and the UAE &mdash; the bulk of them men like you:
                professionals with real careers, real families, and no time for a plan that only works in theory.
              </p>
              <p>
                He still takes every Blueprint Call himself. That&rsquo;s deliberate. It limits how many people
                he can speak to each week, and it&rsquo;s the reason his clients don&rsquo;t get handed to an
                assistant on day two. As featured on <strong>Aaj Tak, Zee News, HealthXP</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* H · The terms, in plain language */}
      <section className="af-money nf-terms" style={{ background: "#1A1611" }}>
        <div className="af-wrap">
          <h2 data-af-reveal style={{ textAlign: "center" }}>
            The Terms, <span className="af-accent">In Plain Language</span>
          </h2>
          <div className="nf-terms-grid" data-af-reveal style={{ "--d": ".08s" } as React.CSSProperties}>
            <div className="nf-term">
              <h4>Money Back, Your Judgement</h4>
              <p>
                If you finish the call and feel it wasn&rsquo;t useful, say so on the spot. Full refund of
                your ₹{price}, no conditions, no justification needed. You are the only judge.
              </p>
            </div>
            <div className="nf-term">
              <h4>No-Show Forfeits The Fee</h4>
              <p>
                If you book and don&rsquo;t show up, the ₹{price} is not refunded. Arjun blocks that slot
                personally for you. Treat it the way you&rsquo;d want your own time treated.
              </p>
            </div>
            <div className="nf-term">
              <h4>Reschedule Window</h4>
              <p>
                Need to move the call? Message us on WhatsApp at least 4 hours before your slot and
                we&rsquo;ll reschedule once, no questions. Inside 4 hours, we can&rsquo;t.
              </p>
            </div>
            <div className="nf-term">
              <h4>Secure Payment</h4>
              <p>
                Payment via Razorpay &mdash; UPI, cards, and net banking. You&rsquo;re redirected to book
                your slot immediately after payment, with a confirmation email and prep checklist.
              </p>
            </div>
          </div>
          <CtaBlock checkoutHref={checkoutHref} timerLabel={timerLabel} shortLabel extraStyle={{ marginTop: 36 }} />
        </div>
      </section>

      {/* I · FAQ */}
      <section className="af-faq" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <h2 data-af-reveal>Questions Serious Men <span>Actually Ask.</span></h2>
          <div className="af-faq-list">
            {FAQS.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={f.q} className={`af-q ${isOpen ? "open" : ""}`}>
                  <div
                    className="af-q-head"
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenFaq(isOpen ? -1 : i);
                      }
                    }}
                  >
                    <span>{f.q}</span>
                    <span className="ic">
                      <svg viewBox="0 0 24 24">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </div>
                  <div className="af-q-body">
                    <div className="af-q-body-inner">{f.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* J · Final CTA */}
      <section className="af-final" style={{ background: "#1A1611" }} id="book">
        <div className="af-wrap af-final-inner">
          <h2 data-af-reveal>
            You&rsquo;ve Never Needed More Discipline.<br />
            You&rsquo;ve Needed A <em>System That Survives Your Life.</em>
          </h2>
          <p data-af-reveal style={{ "--d": ".1s" } as React.CSSProperties}>
            30 minutes with Arjun. Your pattern named, your Blueprint outlined, your call on whether it
            was worth ₹{price}. If it wasn&rsquo;t, the money comes back.
          </p>
          <CtaBlock checkoutHref={checkoutHref} timerLabel={timerLabel} shortLabel delay=".2s" />
        </div>
      </section>

      {/* Footer */}
      <footer className="af-foot" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <div className="copy">© 2026 Arjun Fitness. All rights reserved.</div>
          <p>
            All content, systems and coaching services provided by Arjun Fitness Coaching are intended for
            educational and informational purposes only and do not guarantee specific results. This is not
            medical, legal or licensed professional advice. Always consult a qualified healthcare professional
            before making changes to your diet, exercise or lifestyle. Client results and testimonials vary
            based on individual factors such as consistency, medical history, lifestyle and adherence to the
            process. Outcomes are not typical or guaranteed. This website is not affiliated with or endorsed by
            Meta. FACEBOOK and INSTAGRAM are trademarks of Meta Platforms, Inc.
          </p>
          <p style={{ marginTop: 10 }}>Owned and operated by Arjun Shah.</p>
          <div className="links">
            <Link href="/privacy-policy">Privacy Policy</Link> ·{" "}
            <Link href="/terms-and-conditions">Terms &amp; Conditions</Link> ·{" "}
            <Link href="/refund-policy">Refund Policy</Link>
          </div>
        </div>
      </footer>

      {/* Sticky CTA */}
      <div className={`af-stuck ${stickyOn ? "on" : ""}`} id="af-stuck">
        <div className="af-stuck-timer">
          <span className="af-timer-dot" />
          <span className="af-timer-label">Offer expires in</span>
          <span className="af-timer-val">{timerLabel}</span>
        </div>
        <Link href={checkoutHref} className="af-cta">
          <span className="cta-top">
            <span>Apply for the Blueprint Call, ₹{price}</span>
            <span className="arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </span>
          </span>
          <span className="cta-sub">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="rgba(255,255,255,.7)" style={{ flexShrink: 0 }}>
              <path d="M12 2l8 3v7c0 4.97-3.35 9.26-8 10-4.65-.74-8-5.03-8-10V5l8-3z" />
            </svg>
            &nbsp;Money back on the spot • 1-on-1 with Arjun himself
          </span>
        </Link>
      </div>

      {/* Lightbox */}
      {lightbox ? (
        <div className="af-lbox on" id="af-lbox" role="dialog" aria-hidden="false">
          <div className="af-lbox-content">
            <button className="af-lbox-close" type="button" aria-label="Close" onClick={() => setLightbox(null)}>
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <button className="af-lbox-nav af-lbox-prev" type="button" aria-label="Previous" onClick={() => nav(-1)}>
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="af-lbox-img" src={lightbox.slides[lightbox.index].src} alt={lightbox.slides[lightbox.index].alt} />
            <button className="af-lbox-nav af-lbox-next" type="button" aria-label="Next" onClick={() => nav(1)}>
              <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div className="af-lbox-counter">
              {lightbox.index + 1} / {lightbox.slides.length}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ─── helpers ─── */

function CtaBlock({
  checkoutHref,
  timerLabel,
  shortLabel,
  wrapperClass,
  extraStyle,
  delay,
}: {
  checkoutHref: string;
  timerLabel: string;
  shortLabel?: boolean;
  wrapperClass?: string;
  extraStyle?: React.CSSProperties;
  delay?: string;
}) {
  const price = clientConfig.pricing.price;
  const desktopLabel = shortLabel
    ? `Apply for the Blueprint Call, ₹${price}`
    : `Apply for the Blueprint Call — ₹${price}`;
  const mobileLabel = `Apply for the Blueprint Call, ₹${price}`;

  const style: React.CSSProperties = {
    ...(delay ? ({ "--d": delay } as React.CSSProperties) : {}),
    ...(extraStyle ?? {}),
  };

  return (
    <div className={wrapperClass ?? "af-cta-block"} data-af-reveal style={style}>
      <Link href={checkoutHref} className="af-cta">
        <span className="cta-top">
          <span className="cta-d">{desktopLabel}</span>
          <span className="cta-m">{mobileLabel}</span>
          <span className="arrow">
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </span>
        </span>
        <span className="cta-sub">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="rgba(255,255,255,.7)" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 2l8 3v7c0 4.97-3.35 9.26-8 10-4.65-.74-8-5.03-8-10V5l8-3z" />
          </svg>
          {" "}30 min · 1-on-1 with Arjun himself &nbsp;&bull;&nbsp; Money back on the spot
        </span>
      </Link>
      <div className="af-timer">
        <span className="af-timer-dot" />
        <span className="af-timer-label">Offer expires in</span>
        <span className="af-timer-val">{timerLabel}</span>
      </div>
      <p className="af-cta-note">
        A diagnostic session, not a sales pitch. If Arjun isn&rsquo;t the right fit for you, he&rsquo;ll tell
        you directly.
      </p>
    </div>
  );
}

function BeforeAfterSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

interface CarouselRowProps {
  id: string;
  trackId: string;
  setId: string;
  direction: "ltr" | "rtl";
  slides: Slide[];
  extraClass?: string;
  onSlideClick: (idx: number) => void;
}

function CarouselRow({
  id,
  trackId,
  setId,
  direction,
  slides,
  extraClass,
  onSlideClick,
}: CarouselRowProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    const track = trackRef.current;
    const set = setRef.current;
    if (!carousel || !track || !set) return;

    if (!document.getElementById("af-gal-keyframes")) {
      const style = document.createElement("style");
      style.id = "af-gal-keyframes";
      style.textContent = `
        @keyframes af-gal-scroll-ltr {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes af-gal-scroll-rtl {
          from { transform: translate3d(-50%, 0, 0); }
          to   { transform: translate3d(0, 0, 0); }
        }
        .af-root .af-gal-carousel:hover .af-gal-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .af-root .af-gal-track { animation: none !important; }
        }
      `;
      document.head.appendChild(style);
    }

    if (track.dataset.afPrimed !== "1") {
      track.dataset.afPrimed = "1";
      const clone = set.cloneNode(true) as HTMLElement;
      clone.removeAttribute("id");
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
      const durationSec = Math.max(40, Math.round(slides.length * 3.5));
      track.style.willChange = "transform";
      track.style.animation = `${direction === "rtl" ? "af-gal-scroll-rtl" : "af-gal-scroll-ltr"} ${durationSec}s linear infinite`;
    }

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            track.style.animationPlayState = e.isIntersecting ? "running" : "paused";
          }
        },
        { threshold: 0 },
      );
      io.observe(carousel);
    }
    return () => {
      if (io) io.disconnect();
    };
  }, [direction, slides.length]);

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const slide = target.closest<HTMLElement>(".af-gslide");
    if (!slide) return;
    const idx = Number(slide.dataset.index);
    if (Number.isFinite(idx)) onSlideClick(idx);
  };

  return (
    <div
      ref={carouselRef}
      className={`af-gal-carousel ${extraClass ?? ""}`.trim()}
      id={id}
      data-direction={direction}
      onClick={handleWrapperClick}
    >
      <div ref={trackRef} className="af-gal-track" id={trackId}>
        <div ref={setRef} className="af-gal-set" id={setId}>
          {slides.map((s, i) => (
            <div
              key={s.src}
              className="af-gslide"
              data-index={i}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSlideClick(i);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

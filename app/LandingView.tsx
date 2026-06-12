"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clientConfig } from "@/client.config";
import { readUtmFromStorage, utmToQueryString } from "@/lib/utm";

const HERO_VIDEO_URL = "https://player.vimeo.com/video/1200720150";
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

const FAQS = [
  {
    q: "Is this a sales call?",
    a: "No. This is a diagnostic session. In 30 minutes, we look at your specific situation, your lifestyle, your schedule, your patterns, and identify exactly where your plan is breaking. If we're the right fit to work together, we'll discuss that at the end. If not, I'll tell you directly. No pressure either way.",
  },
  {
    q: "Will I be locked into a long-term commitment?",
    a: `The call itself is a one-time ₹${clientConfig.pricing.price} session with no automatic commitment. If we move forward together after the call, the minimum program is 3 months, because that's the honest minimum time needed to see real, sustainable results. Anything shorter is a shortcut, and I don't do those.`,
  },
  {
    q: "Is this a video call workout session?",
    a: "No. Arjun's coaching is not live workout sessions over video. It's a complete nutrition and training system built around your actual life, delivered through WhatsApp and calls when needed. No apps. No dashboards. Direct access to Arjun himself.",
  },
  {
    q: "Do I have to follow a strict diet and give up eating out?",
    a: "The entire system is built around the fact that you won't. Travel happens. Client dinners happen. Social weekends happen. The plan adapts to your life in real time, not the other way around. Arjun's clients eat at restaurants, travel for work, and still make consistent progress. That's the point.",
  },
];

export function LandingView() {
  const [openFaq, setOpenFaq] = useState(0);
  const [stickyOn, setStickyOn] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [lightbox, setLightbox] = useState<{ slides: Slide[]; index: number } | null>(null);
  const [timerLabel, setTimerLabel] = useState("15:00");
  const [checkoutHref, setCheckoutHref] = useState("/checkout");

  // Sticky scroll + reveal + UTM CTA rewrite + timer.
  // No browser Pixel events fire here — the only browser event in the funnel
  // is PageView, fired automatically from app/layout.tsx with MAM identity.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Append UTM to all checkout CTAs
    const utm = readUtmFromStorage(clientConfig.funnel.sessionStorageKey);
    const qs = utmToQueryString(utm);
    setCheckoutHref(`/checkout?from=landing${qs}`);

    // Reveal animations are now CSS-only — the `[data-af-reveal]` rule uses
    // a keyframe animation that auto-plays on first paint. No JS observer
    // needed (and removing it prevents React re-renders from wiping the
    // observer-added `.vis` class, which used to make FAQ items disappear
    // when you clicked them).

    // Sticky CTA
    const hero = document.querySelector<HTMLElement>(".af-hero");
    const onScroll = () => {
      if (hero) setStickyOn(hero.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // 15-minute countdown timer — loops forever in-session, resets on a new
    // browser session. sessionStorage persists the start timestamp so it
    // survives in-page navigations + back/forward, but auto-clears when all
    // tabs/windows of the site are closed (which is exactly "new session").
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
      // Wrap-around: when the cycle elapses (remaining <= 0) advance `started`
      // by however many full cycles have completed since it was set. Using
      // `floor` (not floor+1) lands us at the start of the CURRENT cycle, so
      // the next remaining is between 0 and DURATION — i.e. always within
      // 15:00, never beyond it.
      if (remaining <= 0) {
        const elapsed = Date.now() - started;
        const cyclesCompleted = Math.max(1, Math.floor(elapsed / DURATION));
        started = started + cyclesCompleted * DURATION;
        try {
          window.sessionStorage.setItem(STORAGE_KEY, String(started));
        } catch {
          // sessionStorage may be unavailable (private mode / quota) — ignore
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

  // Lightbox keyboard nav
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
      <div
        className="af-announce"
        style={{ background: "#000", overflow: "hidden" }}
      >
        <div className="af-announce-track">
          {Array.from({ length: 2 }).map((_, dup) => (
            <span key={dup} style={{ display: "contents" }}>
              <span><b>1,500+</b> Clients Transformed Globally in 5 Years</span><span className="dot" />
              <span>🔥 Real Plans. Real Schedules. Real Results.</span><span className="dot" />
              <span><b>3 Crore+</b> Views on Arjun&apos;s Own Transformation</span><span className="dot" />
              <span>India · UK · Canada · Australia</span><span className="dot" />
            </span>
          ))}
        </div>
      </div>

      {/* Site header */}
      <header className="af-header">
        <div className="af-wrap">
          <Link
            href="/"
            className="af-logo"
            aria-label="Team Fit Arjun — home"
          >
            <span id="af-logo-mark" className="af-logo-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Site%20main%20logo.png" alt="TFA" className="af-logo-img" />
            </span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="af-hero" style={{ background: "#0E0C09" }}>
        <div className="af-wrap af-hero-inner">
          <div className="af-callout" data-af-reveal>
            For Indian Working Men Who&rsquo;ve Tried Diets, Workouts &amp; Still Aren&rsquo;t Seeing Results
          </div>

          <h1 className="af-h1" data-af-reveal style={{ "--d": ".06s" } as React.CSSProperties}>
            You Started Working Out. It Worked For A While. Then One Missed Day Became{" "}
            <span className="af-accent">&ldquo;Chhod Yaar, Kal Karunga.&rdquo;</span>{" "}
            And Tomorrow <span className="af-box">Never Came.</span>
          </h1>

          <p className="af-sub" data-af-reveal style={{ "--d": ".14s" } as React.CSSProperties}>
            Watch the video below to see exactly why this loop keeps repeating, and the system that breaks it.
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
                <iframe
                  src={`${HERO_VIDEO_URL}?autoplay=1&title=0&byline=0&portrait=0&playsinline=1&color=C9954D`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                    zIndex: 5,
                  }}
                />
              )}
            </div>
          </div>

          <CtaBlock checkoutHref={checkoutHref} timerLabel={timerLabel} delay=".3s" extraStyle={{ marginTop: 8 }} />
        </div>
      </section>

      {/* Real Professionals */}
      <section className="af-proof" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <h2 data-af-reveal>
            Real Professionals. Real Schedules. <em>Real Results.</em>
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
                    <div>
                      <BeforeAfterSvg /><br />Before
                    </div>
                  </div>
                  <div className="tside a">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.after} alt={`${t.name.split(" ")[0]} after`} loading="lazy" decoding="async" />
                    <div>
                      <BeforeAfterSvg /><br />After
                    </div>
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
              <div className="af-cred-num"><span className="af-count" data-target="1500">1500</span>+</div>
              <div className="af-cred-label">Clients Transformed</div>
              <div className="af-cred-sub">Globally in 5 Years</div>
            </div>
            <div className="af-cred-item">
              <div className="af-cred-num">3 Cr+</div>
              <div className="af-cred-label">Views on Arjun&rsquo;s</div>
              <div className="af-cred-sub">Own Transformation</div>
            </div>
            <div className="af-cred-item">
              <div className="af-cred-num">5 Yrs</div>
              <div className="af-cred-label af-cred-text">
                India · UK · Canada<span className="cred-br"> </span>· Aus · UAE
              </div>
              <div className="af-cred-sub">&amp; many more countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* Carousel gallery */}
      <section
        className="af-gallery"
        style={{ background: "#1A1611", overflow: "hidden" }}
      >
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

      {/* Money-back */}
      <section className="af-money" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <div className="af-money-card" data-af-reveal>
            <div className="af-money-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l8 3v7c0 4.97-3.35 9.26-8 10-4.65-.74-8-5.03-8-10V5l8-3z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div className="af-money-badge">
              <svg viewBox="0 0 24 24" fill="#22C55E"><path d="M12 2l8 3v7c0 4.97-3.35 9.26-8 10-4.65-.74-8-5.03-8-10V5l8-3z" /></svg>
              100% Money-Back Guarantee
            </div>
            <h2>
              This Call Is <em>Completely Risk-Free.</em>
              <br />If It Doesn&rsquo;t Deliver, You Don&rsquo;t Pay.
            </h2>
            <p>
              Book the session, show up, and have the conversation. If you don&rsquo;t walk away with{" "}
              <strong>clear, actionable insight</strong> specific to your lifestyle, patterns and situation,
              we will refund your full &#8377;{clientConfig.pricing.price} on the spot.{" "}
              <strong>No conditions. No justification needed. You decide if it was worth it.</strong>
            </p>
            <div className="af-money-kicker">
              The risk is entirely ours. Because we back this 100%.
            </div>
            <div className="af-money-pts" data-af-reveal style={{ "--d": ".1s" } as React.CSSProperties}>
              <MoneyPt strong="No Conditions" note="Show up & have the conversation" />
              <MoneyPt strong="No Justification Needed" note="Just say it didn't work for you" />
              <MoneyPt strong="You Decide Its Worth" note="Your judgement is the only criteria" />
              <MoneyPt strong="Instant Refund" note="Processed immediately on request" />
            </div>
            <CtaBlock checkoutHref={checkoutHref} timerLabel={timerLabel} />
          </div>
        </div>
      </section>

      {/* Discover */}
      <section className="af-skim" style={{ background: "#1A1611", overflow: "hidden" }}>
        <div className="af-wrap">
          <div className="af-skim-head">
            <h2 data-af-reveal>
              If You&apos;ve Been Trying For Years And The Body Still Hasn&apos;t Changed,
              <span className="af-accent"> The Problem Is Not You.</span>
            </h2>
            <p data-af-reveal style={{ "--d": ".08s" } as React.CSSProperties}>
              In this video, <strong>Arjun Shah</strong>, who has transformed{" "}
              <strong>1,500+ professionals</strong> globally over <strong>5 years</strong>,
              breaks down exactly why this happens and what actually fixes it.
            </p>
          </div>

          <div className="af-skim-grid">
            <div data-af-reveal>
              <div className="af-discover-label">
                What You&apos;ll <span className="acc">Discover</span> In The Video
              </div>
              <ul className="af-discover-list">
                <li><strong>The Broken System:&nbsp;</strong><p>Why 99% of fitness coaches give you a generic plan and disappear, and why those plans are designed to fail under real life pressure.</p></li>
                <li><strong>Context Over Calories:&nbsp;</strong><p>How your travel, client dinners, late meetings and social weekends get accounted for in your plan, so your progress never stops because life happened.</p></li>
                <li><strong>The &ldquo;Chhod Yaar&rdquo; Fix:&nbsp;</strong><p>The exact decision pattern that causes high-performing professionals to collapse under chaos, and the one structural change that permanently removes it.</p></li>
                <li><strong>The Early Shift:&nbsp;</strong><p>Why most clients start feeling a visible difference in energy and body within the first 2&ndash;3 weeks, without any extreme changes to their lifestyle.</p></li>
                <li><strong>The Calorie Calculator Brain:&nbsp;</strong><p>How Arjun coaches you to the point where you instinctively know what to eat at any restaurant, on any trip, in any situation, without needing to message him.</p></li>
              </ul>
            </div>

            <div className="af-skim-photos" data-af-reveal style={{ "--d": ".15s" } as React.CSSProperties}>
              <div className="af-photo af-photo-r1" style={{ position: "relative" }}>
                <div className="shim" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/What%20discover%201.jpg"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div className="af-photo af-photo-r2" style={{ position: "relative" }}>
                <div className="shim" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/What%20discover%202.jpeg"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
          </div>

          <div className="af-skim-cta">
            <CtaBlock checkoutHref={checkoutHref} timerLabel={timerLabel} shortLabel />
          </div>
        </div>
      </section>

      {/* Accountability guarantee */}
      <section className="af-guard" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <div className="af-guard-card" data-af-reveal>
            <div className="af-shield">
              <svg viewBox="0 0 24 24">
                <path d="M12 2l8 3v7c0 4.97-3.35 9.26-8 10-4.65-.74-8-5.03-8-10V5l8-3zm-1 13l5-5-1.41-1.41L11 12.17l-2.59-2.58L7 11l4 4z" />
              </svg>
            </div>
            <h2>The 100% <span className="af-accent">Accountability Guarantee</span></h2>
            <p>Arjun does not give you a plan and disappear.</p>
            <p>If you follow through with full compliance, diet, workouts, daily steps, water intake, and visible progress still doesn&apos;t come, Arjun will continue working with you at <strong>no additional cost</strong> until the result arrives.</p>
            <p><strong>No time limit. No excuses. No fine print.</strong></p>
            <div className="af-guard-kicker">The risk is entirely his. Because he backs his system 100%.</div>
          </div>
        </div>
      </section>

      {/* Meet Arjun */}
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
                <div><b>1,500+</b><span>Clients</span></div>
                <div><b>5 Yrs</b><span>Global Work</span></div>
              </div>
            </div>
            <div className="af-about-text" data-af-reveal style={{ "--d": ".12s" } as React.CSSProperties}>
              <h2>Meet Your Coach, <span>Arjun</span></h2>
              <p>Over the last <strong>5 years</strong>, Arjun has worked with <strong>1,500+ clients</strong> across different lifestyles, from busy working professionals to individuals who had already tried multiple diets and workouts without success.</p>
              <p>What sets him apart isn&apos;t just the number, but the <strong>consistency of results</strong>. Instead of generic plans, he focuses on building highly customized systems around each person&apos;s routine, food habits and constraints, which is why his clients don&apos;t just lose fat, but <strong>sustain it long-term</strong> without giving up their lifestyle.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Two options */}
      <section className="af-two" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <h2 data-af-reveal>Let&apos;s Be Clear,<br />You Have <em>Two Choices</em> From Here</h2>
          <div className="af-opt-grid">
            <div className="af-opt af-opt-1" data-af-reveal>
              <div className="opt-num">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Option 01
              </div>
              <p>Continue managing your weight the way you are now, adjusting food, workouts and medicines on your own, and hoping things improve over time.</p>
            </div>
            <div className="af-opt af-opt-2" data-af-reveal style={{ "--d": ".12s" } as React.CSSProperties}>
              <div className="opt-num">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Option 02
              </div>
              <p>Get a clear roadmap of what&apos;s actually working for your body, and leave the call with a practical, tailored plan built around your lifestyle, food habits and schedule.</p>
            </div>
          </div>
          <CtaBlock
            checkoutHref={checkoutHref}
            timerLabel={timerLabel}
            shortLabel
            wrapperClass="af-cta-block af-two-cta"
            extraStyle={{ marginTop: 36 }}
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="af-faq" style={{ background: "#1A1611" }}>
        <div className="af-wrap">
          <h2 data-af-reveal>Before You Book, <span>Quick Answers.</span></h2>
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

      {/* Final CTA */}
      <section className="af-final" style={{ background: "#0E0C09" }} id="book">
        <div className="af-wrap af-final-inner">
          <h2 data-af-reveal>
            You Don&apos;t Need A New Plan.<br />
            You Need A <em>System That Survives Your Actual Life.</em>
          </h2>
          <p data-af-reveal style={{ "--d": ".1s" } as React.CSSProperties}>
            The problem is not your effort. It&apos;s not your discipline. It&apos;s the moment your plan
            meets your real, chaotic, busy life, and breaks.
          </p>
          <p data-af-reveal style={{ "--d": ".18s" } as React.CSSProperties}>
            Book your 30-minute Custom Execution Blueprint Call. We&apos;ll find exactly where that
            moment happens for you, and fix it permanently.
          </p>
          <CtaBlock checkoutHref={checkoutHref} timerLabel={timerLabel} shortLabel delay=".26s" />
        </div>
      </section>

      {/* Footer */}
      <footer className="af-foot" style={{ background: "#0E0C09" }}>
        <div className="af-wrap">
          <div className="copy">© 2026 Arjun Fitness. All rights reserved.</div>
          <p>
            All content, systems and coaching services provided by Arjun Fitness Coaching are intended for educational and informational purposes only and do not guarantee specific results. This is not medical, legal or licensed professional advice. Always consult a qualified healthcare professional before making changes to your diet, exercise or lifestyle. Client results and testimonials vary based on individual factors such as consistency, medical history, lifestyle and adherence to the process. Outcomes are not typical or guaranteed. This website is not affiliated with or endorsed by Meta. FACEBOOK and INSTAGRAM are trademarks of Meta Platforms, Inc.
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
            <span>Book My Blueprint Call, &#8377;{clientConfig.pricing.price}</span>
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
            &nbsp;100% Money-Back Guarantee • No Questions Asked
          </span>
        </Link>
      </div>

      {/* Lightbox */}
      {lightbox ? (
        <div
          className="af-lbox on"
          id="af-lbox"
          role="dialog"
          aria-hidden="false"
        >
          <div className="af-lbox-content">
            <button
              className="af-lbox-close"
              type="button"
              aria-label="Close"
              onClick={() => setLightbox(null)}
            >
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <button
              className="af-lbox-nav af-lbox-prev"
              type="button"
              aria-label="Previous"
              onClick={() => nav(-1)}
            >
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="af-lbox-img"
              src={lightbox.slides[lightbox.index].src}
              alt={lightbox.slides[lightbox.index].alt}
            />
            <button
              className="af-lbox-nav af-lbox-next"
              type="button"
              aria-label="Next"
              onClick={() => nav(1)}
            >
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
  const desktopLabel = shortLabel
    ? `Book My Custom Execution Blueprint Call, ₹${clientConfig.pricing.price}`
    : (
      <>
        Book My Custom Execution Blueprint Call &mdash; &#8377;{clientConfig.pricing.price}
      </>
    );
  const mobileLabel = shortLabel
    ? `Book My Blueprint Call, ₹${clientConfig.pricing.price}`
    : `Book Blueprint Call — ₹${clientConfig.pricing.price}`;

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
          {" "}100% Money-Back Guarantee &nbsp;&bull;&nbsp; No Questions Asked
        </span>
      </Link>
      <div className="af-timer">
        <span className="af-timer-dot" />
        <span className="af-timer-label">Offer expires in</span>
        <span className="af-timer-val">{timerLabel}</span>
      </div>
      <p className="af-cta-note">
        A diagnostic session, not a sales pitch. If we are not the right fit, I will tell you directly.
      </p>
    </div>
  );
}

function MoneyPt({ strong, note }: { strong: string; note: string }) {
  return (
    <div className="af-mpt">
      <div className="af-mpt-ic">
        <svg viewBox="0 0 24 24" fill="none">
          <polyline points="20 6 9 17 4 12" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <strong>{strong}</strong>
        <span>{note}</span>
      </div>
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

  // Event delegation on the carousel wrapper. The track is duplicated via
  // cloneNode for infinite scroll; clones don't have React handlers, so we
  // catch clicks on the wrapper and resolve the slide via data-index.
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

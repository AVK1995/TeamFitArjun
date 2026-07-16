"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientConfig } from "@/client.config";
import { readUtmFromStorage, utmToQueryString } from "@/lib/utm";
import { trackGa4EventOnce } from "@/lib/ga4";

interface Slide {
  src: string;
  alt: string;
}

const ROW_1_SLIDES: Slide[] = [
  { src: "/transformations/top%206%20carousel%201/1.jpg.jpeg", alt: "Featured Transformation 01" },
  { src: "/transformations/top%206%20carousel%201/2.jpg.jpeg", alt: "Featured Transformation 02" },
  { src: "/transformations/top%206%20carousel%201/3.jpg.jpeg", alt: "Featured Transformation 03" },
  { src: "/transformations/top%206%20carousel%201/4.jpg.jpeg", alt: "Featured Transformation 04" },
  { src: "/transformations/top%206%20carousel%201/5.jpg.jpeg", alt: "Featured Transformation 05" },
  { src: "/transformations/top%206%20carousel%201/6.jpg.jpeg", alt: "Featured Transformation 06" },
  { src: "/transformations/a-10.png", alt: "Transformation 10" },
  { src: "/transformations/a-15.png", alt: "Transformation 15" },
  { src: "/transformations/a-16.png", alt: "Transformation 16" },
  { src: "/transformations/a-30.png", alt: "Transformation 30" },
  { src: "/transformations/a-1.png", alt: "Transformation 01" },
  { src: "/transformations/a-3.png", alt: "Transformation 03" },
  { src: "/transformations/a-5.png", alt: "Transformation 05" },
  { src: "/transformations/a-7.png", alt: "Transformation 07" },
  { src: "/transformations/a-12.png", alt: "Transformation 12" },
  { src: "/transformations/a-19.png", alt: "Transformation 19" },
];

const ROW_2_SLIDES: Slide[] = [
  { src: "/transformations/top%206%20carousel%202/7.jpg.jpeg", alt: "Featured Transformation 07" },
  { src: "/transformations/top%206%20carousel%202/8.jpg.jpeg", alt: "Featured Transformation 08" },
  { src: "/transformations/top%206%20carousel%202/9.jpg.jpeg", alt: "Featured Transformation 09" },
  { src: "/transformations/top%206%20carousel%202/10.jpg.jpeg", alt: "Featured Transformation 10" },
  { src: "/transformations/top%206%20carousel%202/11.jpg.jpeg", alt: "Featured Transformation 11" },
  { src: "/transformations/top%206%20carousel%202/12.jpg.jpeg", alt: "Featured Transformation 12" },
  { src: "/transformations/a-38.png", alt: "Transformation 38" },
  { src: "/transformations/a-42.png", alt: "Transformation 42" },
  { src: "/transformations/a-34.png", alt: "Transformation 34" },
  { src: "/transformations/a-44.png", alt: "Transformation 44" },
  { src: "/transformations/a-48.png", alt: "Transformation 48" },
];

const FAQS = [
  {
    q: "Is the call directly with Arjun?",
    a: "Yes. Every Custom Execution Blueprint Call is 1:1 with Arjun himself. No team member, no assistant, no junior coach. He runs every call personally so the diagnosis is sharp and the plan that comes out of it is yours, not a template.",
  },
  {
    q: "What if I need to reschedule?",
    a: `One free reschedule, up to 4 hours before your slot. Use the link in your booking email. Beyond 4 hours or a no-show, the slot's gone and the ₹${clientConfig.pricing.price} doesn't carry forward.`,
  },
];

export function BookACallView() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState(0);
  const [stickyOn, setStickyOn] = useState(false);
  const [lightbox, setLightbox] = useState<{ slides: Slide[]; index: number } | null>(null);

  // Sticky CTA + Calendly listener. Reveal animations are now CSS-only
  // (see `[data-af-reveal]` keyframe rule) so no observer needed.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hero = document.querySelector<HTMLElement>(".bk-hero");
    const onScroll = () => {
      if (hero) setStickyOn(hero.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Calendly postMessage → /thank-you
    const search = new URLSearchParams(window.location.search);
    function isCalendlyEvent(
      e: MessageEvent,
    ): e is MessageEvent<{ event: string; payload?: Record<string, unknown> }> {
      return (
        e.origin === "https://calendly.com" &&
        typeof e.data === "object" &&
        e.data !== null &&
        "event" in e.data &&
        typeof (e.data as { event: unknown }).event === "string" &&
        (e.data as { event: string }).event.startsWith("calendly.")
      );
    }
    function onMessage(e: MessageEvent) {
      if (!isCalendlyEvent(e)) return;
      if (e.data.event === "calendly.event_scheduled") {
        // GA4 `book_call` — fires exactly once per browser when the visitor
        // actually schedules a slot in the embedded Calendly iframe. This
        // is the real "call booked" signal (the page CTAs above are
        // scroll-to-calendar, not booking actions).
        trackGa4EventOnce("book_call");
        // Persist the Calendly booking refs so the thank-you quiz submit
        // can include them in the webhook payload. The Pabbly workflow can
        // resolve these URIs through Calendly's API to fetch booking time +
        // invitee details, or just record them for downstream lookups.
        const payload = e.data.payload as
          | {
              event?: { uri?: string };
              invitee?: { uri?: string };
            }
          | undefined;
        try {
          window.sessionStorage.setItem(
            "arjun_calendly",
            JSON.stringify({
              eventUri: payload?.event?.uri ?? "",
              inviteeUri: payload?.invitee?.uri ?? "",
              scheduledAt: new Date().toISOString(),
            }),
          );
        } catch {
          // sessionStorage may be unavailable — non-fatal, URIs just won't
          // be included in the quiz payload
        }

        const orderId = search.get("orderId") ?? "";
        const paymentId = search.get("paymentId") ?? "";
        const eventId = search.get("eventId") ?? orderId;
        const utm = readUtmFromStorage(clientConfig.funnel.sessionStorageKey);
        const qs = utmToQueryString(utm);
        const url =
          `/thank-you?` +
          `orderId=${encodeURIComponent(orderId)}` +
          `&paymentId=${encodeURIComponent(paymentId)}` +
          `&eventId=${encodeURIComponent(eventId)}` +
          `&booked=1${qs}`;
        setTimeout(() => router.push(url), 600);
      }
    }
    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("message", onMessage);
    };
  }, [router]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (!lightbox) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") navLightbox(-1);
      if (e.key === "ArrowRight") navLightbox(1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  function navLightbox(delta: number) {
    setLightbox((prev) => {
      if (!prev) return prev;
      const n = prev.slides.length;
      return { ...prev, index: (prev.index + delta + n) % n };
    });
  }

  function openLightbox(slides: Slide[], idx: number) {
    setLightbox({ slides, index: idx });
  }

  return (
    <div className="af-root">
      {/* Status bar */}
      <div className="bk-status">
        <span className="check">✓</span>
        <strong>Payment Confirmed</strong>
        <span className="sep">·</span>1 step left
        <span className="sep">·</span>30 min with Arjun
      </div>

      {/* Logo header */}
      <header className="bk-header">
        <Link
          href="/"
          className="bk-logo"
          aria-label="Team Fit Arjun — home"
        >
          <span className="bk-logo-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Site%20main%20logo.png"
              alt="Team Fit Arjun"
              className="bk-logo-img"
            />
          </span>
        </Link>
      </header>

      <div className="af-wrap">
        {/* Step indicator */}
        <div className="bk-steps" data-af-reveal>
          <div className="bk-step done">
            <span className="num">✓</span>
            <span>Paid</span>
          </div>
          <div className="bk-line" />
          <div className="bk-step active">
            <span className="num">2</span>
            <span>Book Call</span>
          </div>
        </div>

        {/* Hero */}
        <section className="bk-hero">
          <div className="bk-hero-inner">
            <span className="bk-eyebrow" data-af-reveal>One step left</span>
            <h1 data-af-reveal style={{ "--d": ".06s" } as React.CSSProperties}>
              Pick a time. Show up.<br />
              <span className="af-accent">Walk away with a real plan.</span>
            </h1>
            <p data-af-reveal style={{ "--d": ".14s" } as React.CSSProperties}>
              Your &#8377;{clientConfig.pricing.price} is in. Now lock the 30
              minutes that actually change your routine. Slot below.
            </p>
          </div>
        </section>

        {/* Calendar */}
        <section className="bk-cal" id="bk-calendar" data-af-reveal>
          <h2>Pick a slot that works for you</h2>
          <p className="bk-cal-sub">All times in your local zone. Green slots are open.</p>
          <div
            className="calendly-inline-widget"
            data-url={clientConfig.event.calendlyUrl}
          />
          <div className="bk-trust">
            <div className="bk-trust-item">
              <span className="bk-trust-tick">✓</span>
              <span>
                <strong>1:1 directly with Arjun.</strong> Not a team member,
                not an assistant.
              </span>
            </div>
            <div className="bk-trust-item">
              <span className="bk-trust-tick">✓</span>
              <span>
                <strong>Zoom link in your inbox</strong> the moment you book.
              </span>
            </div>
            <div className="bk-trust-item">
              <span className="bk-trust-tick">✓</span>
              <span>
                <strong>Free reschedule</strong> once, up to 4 hours before
                your slot.
              </span>
            </div>
          </div>
        </section>

        {/* Transformations */}
        <section className="bk-trans">
          <h2 data-af-reveal>
            Before &amp; After <span className="af-accent">Transformations</span>
          </h2>
          <p className="bk-trans-sub" data-af-reveal style={{ "--d": ".06s" } as React.CSSProperties}>
            Real working professionals. Real schedules. Real shifts.
          </p>

          <CarouselRow
            id="af-gal-carousel-1"
            trackId="af-gal-track-1"
            setId="af-gal-set-1"
            direction="ltr"
            slides={ROW_1_SLIDES}
            onSlideClick={(i) => openLightbox(ROW_1_SLIDES, i)}
          />

          <CarouselRow
            id="af-gal-carousel-2"
            trackId="af-gal-track-2"
            setId="af-gal-set-2"
            direction="rtl"
            slides={ROW_2_SLIDES}
            extraClass="af-gal-carousel-row2"
            onSlideClick={(i) => openLightbox(ROW_2_SLIDES, i)}
          />
        </section>

        {/* Mid CTA */}
        <section className="bk-mid">
          <h3 data-af-reveal>
            They were stuck too. Then they{" "}
            <span className="af-accent">picked a slot.</span>
          </h3>
          <a
            href="#bk-calendar"
            className="af-cta"
            data-af-reveal
            style={{ "--d": ".08s" } as React.CSSProperties}
          >
            <span>Pick my slot</span>
            <span className="arrow">
              <svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </span>
          </a>
        </section>

        {/* Walkaways */}
        <section className="bk-walk">
          <h2 data-af-reveal>
            What you walk away with in <span className="af-accent">30 minutes</span>
          </h2>
          <div className="bk-walk-grid">
            <WalkCard num="01" title="An honest read on why your routine isn't working" body="Where it's actually breaking. Not what to add." />
            <WalkCard num="02" delay=".08s" title={`Your "Chhod Yaar moment," called out specifically`} body="The exact point your discipline collapses in a busy week. Named, then structured around." />
            <WalkCard num="03" delay=".16s" title="The next 30 days, mapped" body="What to change first, what to drop, what to track. In plain words." />
          </div>
        </section>

        {/* Loss aversion */}
        <section className="bk-loss" data-af-reveal>
          <h2>
            <span className="bk-loss-big">38%</span> of people who pay never show up.
            <br />Don&apos;t be one of them.
          </h2>
          <p>
            Last month, 38% of paid users never came back to pick a slot. They
            told themselves they&apos;d do it Monday. Monday came and went.
          </p>
          <p className="bk-loss-punch">
            Three weeks later: same body, same frustration, &#8377;
            {clientConfig.pricing.price} wasted.
          </p>
          <a href="#bk-calendar" className="af-cta af-cta-large">
            <span>Pick my slot</span>
            <span className="arrow">
              <svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </span>
          </a>
        </section>

        {/* Testimonial */}
        <section className="bk-testimonial" data-af-reveal>
          <span className="bk-quote-mark">&ldquo;</span>
          <blockquote>
            I&apos;d paid &#8377;5k/month trainers who handed me generic PDFs.
            In 30 minutes Arjun gave me a plan that worked around my travel, my
            wife&apos;s cooking, my 6am meetings. Don&apos;t overthink. Book.
          </blockquote>
          <p className="bk-author">
            <strong>Ankush R.</strong> &nbsp;·&nbsp; 23, Sydney &nbsp;·&nbsp; Lost 12 kg in 4 months
          </p>
        </section>

        {/* FAQ */}
        <section className="bk-faq">
          <h2 data-af-reveal>Two quick questions before you book</h2>
          {FAQS.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={f.q}
                className={`bk-q ${isOpen ? "open" : ""}`}
                data-af-reveal
                style={i > 0 ? ({ "--d": ".06s" } as React.CSSProperties) : undefined}
              >
                <div
                  className="bk-q-head"
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
                  <span className="ic">{isOpen ? "−" : "+"}</span>
                </div>
                <div className="bk-q-body">
                  <div className="bk-q-body-inner">{f.a}</div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Final CTA */}
        <section className="bk-final" data-af-reveal>
          <h2>
            You&apos;ve paid. Now <span className="af-accent">lock the call.</span>
          </h2>
          <p>One slot. 30 min with Arjun. Then everything else is on him.</p>
          <a href="#bk-calendar" className="af-cta af-cta-large">
            <span>Take me to the calendar</span>
            <span className="arrow">
              <svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </span>
          </a>
        </section>
      </div>

      {/* Footer */}
      <footer className="bk-footer">
        <p>
          &copy; 2026 Arjun Fitness. All rights reserved. Owned and operated by
          Arjun Shah.
        </p>
        <div className="bk-foot-links">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <span style={{ opacity: 0.4 }}>·</span>
          <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
          <span style={{ opacity: 0.4 }}>·</span>
          <Link href="/refund-policy">Refund Policy</Link>
        </div>
        <p className="bk-foot-legal">
          All content, systems, and coaching services are intended for
          educational and informational purposes only and do not guarantee
          specific results. This is not medical, legal, or licensed professional
          advice. Always consult a qualified healthcare professional before
          making changes to your diet, exercise, or lifestyle. Client results
          vary based on individual factors.
        </p>
      </footer>

      {/* Sticky CTA */}
      <div
        className={`bk-sticky ${stickyOn ? "on" : ""}`}
        id="bk-sticky"
        aria-hidden={!stickyOn}
      >
        <div className="bk-sticky-label">
          <strong>Pick your slot</strong>
          <span>30 min with Arjun, then you&apos;re done.</span>
        </div>
        <a href="#bk-calendar" className="af-cta">
          <span>Book now</span>
        </a>
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
              onClick={() => navLightbox(-1)}
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
              onClick={() => navLightbox(1)}
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

/** Single carousel row — JS-driven scroll (the source CSS expects JS to set transform). */
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

  // Clone the set + apply CSS keyframe scroll, pause off-screen
  useEffect(() => {
    const carousel = carouselRef.current;
    const track = trackRef.current;
    const set = setRef.current;
    if (!carousel || !track || !set) return;

    // Inject keyframes (shared across all rows on the page)
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

    // Clone the set once for seamless loop
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

  // Event delegation — cloned (infinite-scroll) slides also fire clicks.
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

function WalkCard({
  num,
  title,
  body,
  delay,
}: {
  num: string;
  title: string;
  body: string;
  delay?: string;
}) {
  return (
    <div
      className="bk-walk-card"
      data-af-reveal
      style={delay ? ({ "--d": delay } as React.CSSProperties) : undefined}
    >
      <span className="bk-walk-num">{num}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { clientConfig } from "@/client.config";
import { readUtmFromStorage, utmToQueryString } from "@/lib/utm";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface FormState {
  name: string;
  email: string;
  method: string;
  details: string;
}

interface FormErrors {
  name?: boolean;
  email?: boolean;
  method?: boolean;
  details?: boolean;
}

export function PaymentFailedView() {
  const [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    method: "",
    details: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [ticketId, setTicketId] = useState<string>("");
  const [reason, setReason] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [retryHref, setRetryHref] = useState("/checkout");

  // Read URL params + UTM for retry CTA
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setReason(params.get("reason"));
    setCode(params.get("code"));
    const utm = readUtmFromStorage(clientConfig.funnel.sessionStorageKey);
    setRetryHref(`/checkout?retry=1${utmToQueryString(utm)}`);

    // Reveal animations
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("vis");
              io.unobserve(e.target);
            }
          }
        },
        { threshold: 0.12 },
      );
      document.querySelectorAll("[data-rv]").forEach((el) => io.observe(el));
      return () => io.disconnect();
    }
  }, []);

  const tagText = useMemo(() => {
    if (reason) {
      return `${reason.replace(/[<>]/g, "")} — don't worry, this is almost always fixable in a few seconds.`;
    }
    return "Your booking wasn't placed. Don't worry — this is almost always fixable in a few seconds.";
  }, [reason]);

  const kickerText = code
    ? `Payment Not Completed · ${code}`
    : "Payment Not Completed";

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (form.name.trim().length < 2) next.name = true;
    if (!EMAIL_RE.test(form.email.trim())) next.email = true;
    if (!form.method) next.method = true;
    if (form.details.trim().length < 10) next.details = true;
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("method", form.method);
      fd.append("details", form.details);
      if (screenshot) fd.append("screenshot", screenshot);
      if (reason) fd.append("reason", reason);
      if (code) fd.append("code", code);

      const res = await fetch("/api/payment-issue", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`failed: ${res.status}`);
      setResult("success");
      setTicketId(`TFA-${Date.now().toString(36).toUpperCase().slice(-6)}`);
    } catch (err) {
      console.error("[pf] submit failed", err);
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="af-root">
      {/* Hero */}
      <section className="pf-hero">
        <div className="af-wrap">
          <div className="pf-icon">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="pfCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#24B6FF" />
                  <stop offset="100%" stopColor="#0062B4" />
                </linearGradient>
              </defs>
              <rect className="card-back" x="22" y="36" width="58" height="40" rx="5" ry="5" />
              <g className="card-front">
                <rect x="14" y="30" width="62" height="42" rx="5" ry="5" fill="url(#pfCardGrad)" />
                <rect className="card-stripe" x="14" y="38" width="62" height="7" />
                <rect className="card-chip" x="22" y="52" width="9" height="7" rx="1" />
                <line className="card-line" x1="38" y1="56" x2="50" y2="56" />
                <line className="card-line" x1="38" y1="62" x2="68" y2="62" />
              </g>
              <circle className="badge-bg" cx="80" cy="22" r="14" />
              <line className="badge-x" x1="74" y1="16" x2="86" y2="28" />
              <line className="badge-x" x1="86" y1="16" x2="74" y2="28" />
            </svg>
          </div>

          <div className="pf-kicker">{kickerText}</div>
          <h1>Payment didn&apos;t go through</h1>
          <p className="pf-tag">{tagText}</p>

          <div className="pf-reassure">
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            No money was deducted from your account
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="pf-body">
        <div className="af-wrap">
          <div className="pf-grid">
            <div className="pf-grid-left">
              {/* Retry */}
              <div className="pf-block pf-retry" data-rv>
                <div className="pf-block-h">
                  <span className="pf-num">1</span>
                  <h2>
                    Try again first
                    <small>The fastest fix — takes under 30 seconds</small>
                  </h2>
                </div>
                <p>
                  9 times out of 10, the payment retries successfully on the second
                  attempt — especially if you switch to a different payment method.
                  UPI is usually the most reliable in India.
                </p>
                <Link href={retryHref} className="pf-retry-cta">
                  <span>Try the payment again</span>
                  <span className="arrow">
                    <svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                  </span>
                </Link>
                <p className="pf-retry-tip">
                  You&apos;ll go back to the checkout form. Your details might still
                  be saved — just press Pay.
                </p>
                <ul className="pf-tips">
                  <li><span>Switch to <strong>UPI</strong> if cards aren&apos;t working</span></li>
                  <li><span>Switch to <strong>Net Banking</strong> if UPI is slow</span></li>
                  <li><span>Try a <strong>different bank&apos;s card</strong> if available</span></li>
                  <li><span>Check your <strong>internet connection</strong> is stable</span></li>
                </ul>
              </div>

              {/* Honesty */}
              <div className="pf-honesty" data-rv style={{ "--d": ".06s" } as React.CSSProperties}>
                <div className="pf-honesty-h">
                  <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Read this before reporting
                </div>
                <p>
                  Most payment failures are bank-side or device-side issues that
                  resolve themselves on retry — no report needed.{" "}
                  <strong>
                    Please only use the report form below if you&apos;ve already
                    tried multiple methods and the failure is clearly on our end.
                  </strong>
                </p>
                <p>
                  The two columns below help you tell the difference. Reporting
                  issues that aren&apos;t actually our fault slows down support for
                  the people who genuinely need help.
                </p>
              </div>

              {/* Compare columns */}
              <div className="pf-block" data-rv style={{ "--d": ".12s" } as React.CSSProperties}>
                <div className="pf-block-h">
                  <span className="pf-num">2</span>
                  <h2>
                    How to tell whose problem it is
                    <small>If it&apos;s column A, just retry. Only use the form for column B.</small>
                  </h2>
                </div>
                <div className="pf-compare">
                  <div className="pf-side pf-side-user">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Likely your bank or device
                    </h4>
                    <ul>
                      <li>Insufficient funds in account</li>
                      <li>Bank declined the transaction</li>
                      <li>OTP timed out or wasn&apos;t received</li>
                      <li>UPI app crashed or PIN incorrect</li>
                      <li>International cards blocked by issuer</li>
                      <li>Card expired or daily limit hit</li>
                      <li>Bank server temporarily down</li>
                      <li>Internet dropped mid-payment</li>
                    </ul>
                    <span className="pf-side-cap">
                      → For these, just retry — usually with a different method. No need to report.
                    </span>
                  </div>

                  <div className="pf-side pf-side-our">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      </svg>
                      Looks like our setup
                    </h4>
                    <ul>
                      <li>Payment options completely missing</li>
                      <li>Same error across <strong>every</strong> method</li>
                      <li>Razorpay screen won&apos;t load at all</li>
                      <li>&quot;Merchant not configured&quot; error</li>
                      <li>Page redirects to a broken URL</li>
                      <li>JavaScript console shows clear errors</li>
                      <li>Multiple friends report the same issue</li>
                    </ul>
                    <span className="pf-side-cap">
                      → These are on us. Use the form below so we can fix it.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pf-grid-right">
              <form
                className="pf-form"
                data-rv
                style={{ "--d": ".18s" } as React.CSSProperties}
                id="pf-report-form"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="pf-form-head">
                  <span className="pf-num">3</span>
                  <h2>
                    Report a payment issue
                    <small>Only fill this if the problem is on our end (column B above)</small>
                  </h2>
                </div>

                <label className="pf-confirm" htmlFor="pf-confirmed">
                  <input
                    type="checkbox"
                    id="pf-confirmed"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>
                    I&apos;ve already tried at least one alternate payment method
                    (UPI / Card / Net Banking) and the issue still persists. I
                    believe this is on Arjun&apos;s end, not my bank or device.
                  </span>
                </label>

                <div className="pf-fields">
                  <div className={`pf-field ${errors.name ? "invalid" : ""}`}>
                    <label htmlFor="pf-name">Full name <span className="req">*</span></label>
                    <input
                      type="text"
                      id="pf-name"
                      name="name"
                      autoComplete="name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <div className="pf-field-error">Please enter your name</div>
                  </div>

                  <div className={`pf-field ${errors.email ? "invalid" : ""}`}>
                    <label htmlFor="pf-email">Email <span className="req">*</span></label>
                    <input
                      type="email"
                      id="pf-email"
                      name="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <div className="pf-field-error">Please enter a valid email</div>
                  </div>

                  <div className={`pf-field pf-field-full ${errors.method ? "invalid" : ""}`}>
                    <label htmlFor="pf-method">Payment method tried <span className="req">*</span></label>
                    <select
                      id="pf-method"
                      name="method"
                      required
                      value={form.method}
                      onChange={(e) => setForm({ ...form, method: e.target.value })}
                    >
                      <option value="">Select…</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Wallet">Wallet (Paytm / PhonePe etc.)</option>
                      <option value="Multiple">I tried multiple methods</option>
                      <option value="None - page broken">None — the page itself was broken</option>
                    </select>
                    <div className="pf-field-error">Please select a method</div>
                  </div>

                  <div className={`pf-field pf-field-full ${errors.details ? "invalid" : ""}`}>
                    <label htmlFor="pf-details">What happened <span className="req">*</span></label>
                    <textarea
                      id="pf-details"
                      name="details"
                      required
                      value={form.details}
                      onChange={(e) => setForm({ ...form, details: e.target.value })}
                      placeholder={`Walk us through it: what loaded, what failed, the exact error you saw (e.g. "Merchant not configured"). Mention if you tried more than one method.`}
                    />
                    <div className="pf-field-error">Please describe what happened</div>
                  </div>

                  <div className="pf-field pf-field-full">
                    <label htmlFor="pf-screenshot">
                      Screenshot of the error{" "}
                      <span
                        style={{
                          fontWeight: 400,
                          color: "var(--muted)",
                          textTransform: "none",
                          letterSpacing: 0,
                        }}
                      >
                        (optional, max 200KB — large images auto-compressed)
                      </span>
                    </label>
                    <div className="pf-upload">
                      <input
                        type="file"
                        id="pf-screenshot"
                        name="screenshot"
                        accept="image/*"
                        onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                      />
                      <label htmlFor="pf-screenshot" className="pf-upload-btn">
                        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="pf-upload-text">
                          {screenshot ? screenshot.name : "Choose a screenshot"}
                        </span>
                      </label>
                      <div className="pf-upload-status" id="pf-upload-status">
                        {screenshot ? `${(screenshot.size / 1024).toFixed(1)} KB selected` : ""}
                      </div>
                    </div>
                    <div className="pf-field-error" />
                  </div>
                </div>

                <div className="pf-submit-row">
                  <p className="pf-direct">
                    Or email directly:{" "}
                    <a href="mailto:thefitarjun@gmail.com?subject=Payment%20Issue%20Report">
                      thefitarjun@gmail.com
                    </a>
                  </p>
                  <button
                    type="submit"
                    className={`pf-submit ${submitting ? "loading" : ""}`}
                    id="pf-submit-btn"
                    disabled={!confirmed || submitting}
                  >
                    <span className="pf-spinner" />
                    <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    <span className="pf-submit-label">
                      {submitting ? "Sending…" : "Send report"}
                    </span>
                  </button>
                </div>

                {result === "success" ? (
                  <div className="pf-result success on" id="pf-result-success">
                    <div className="pf-result-h">
                      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Report received{" "}
                      <span className="pf-ticket-id" id="pf-ticket-id">
                        {ticketId ? `#${ticketId}` : ""}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 12px", color: "#14532D" }}>
                      Thanks for taking the time. You&apos;ll get a confirmation
                      email at the address you provided, and Arjun will reply
                      directly to that thread within 24 hours.
                    </p>
                    <p style={{ margin: "0 0 14px", color: "#14532D", fontSize: 13.5 }}>
                      In the meantime, please{" "}
                      <strong>try the payment one more time</strong> — many issues
                      clear themselves on retry.
                    </p>
                    <div className="pf-ticket-actions">
                      <Link href={retryHref} className="pf-ticket-btn pf-ticket-btn-primary">
                        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Try payment again
                      </Link>
                      <button
                        type="button"
                        className="pf-ticket-btn pf-ticket-btn-ghost"
                        id="pf-close-ticket"
                        onClick={() => setResult(null)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Close this ticket
                      </button>
                    </div>
                  </div>
                ) : null}

                {result === "error" ? (
                  <div className="pf-result error on" id="pf-result-error">
                    <div className="pf-result-h">
                      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Couldn&apos;t send report
                    </div>
                    <p style={{ margin: 0, color: "var(--danger-deep)" }}>
                      Something went wrong on our side. Please email{" "}
                      <a href="mailto:thefitarjun@gmail.com?subject=Payment%20Issue%20Report">
                        <strong>thefitarjun@gmail.com</strong>
                      </a>{" "}
                      directly with the same details. Sorry for the trouble.
                    </p>
                  </div>
                ) : null}
              </form>
            </div>
          </div>

          <div className="pf-help">
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>
              Quick questions?{" "}
              <a href="mailto:thefitarjun@gmail.com">Email Arjun</a>
            </span>
            <span className="sep">·</span>
            <Link href={retryHref}>Try the payment again</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pf-foot">
        <div className="af-wrap">
          <p className="big">&copy; 2026 Arjun Fitness. All rights reserved.</p>
          <p>Owned and operated by Arjun Shah.</p>
          <div className="links">
            <Link href="/refund-policy">Refund Policy</Link>
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms-and-conditions">Terms of Use</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

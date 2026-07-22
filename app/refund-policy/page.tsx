import { buildMetadata } from "@/lib/seo";
import "./refund.css";

export const dynamic = "force-static";
export const metadata = buildMetadata("refund");

/**
 * Static legal page. Body markup is the original WordPress HTML inlined as
 * a string constant; the per-page CSS is imported above. No interactivity,
 * so React state isn't needed — `dangerouslySetInnerHTML` here is safe
 * because the source is a trusted compile-time constant.
 */
const BODY = `<div class="af-root">

  
  <section class="lg-hero">
    <div class="af-wrap">

      <div class="lg-icon lg-icon-refund">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="rfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#C9954D"/>
              <stop offset="100%" stop-color="#9A6614"/>
            </linearGradient>
          </defs>
          
          <path class="ring" d="M50 18 a32 32 0 1 1 -22.6 9.4"/>
          <polygon class="arr-head" points="46,12 56,22 42,28"/>
          
          <text class="rupee" x="50" y="52">₹</text>
          
          <circle class="spark spark-1" cx="50" cy="50" r="2" style="--tx:22px; --ty:-15px;"/>
          <circle class="spark spark-2" cx="50" cy="50" r="2" style="--tx:-20px; --ty:18px;"/>
          <circle class="spark spark-3" cx="50" cy="50" r="2" style="--tx:18px; --ty:20px;"/>
        </svg>
      </div>

      <div class="lg-kicker">
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        Refunds
      </div>
      <h1>Refund Policy</h1>
      <p class="tag">Cancellations and refunds for services and products on teamfitarjun.com.</p>
      <span class="lg-updated">
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Last updated: April 2026
      </span>

    </div>
  </section>


  
  <section class="lg-body">
    <div class="af-wrap">

      <div class="lg-section" data-rv>
        <h2><span class="num">01</span> Cancellation Policy</h2>
        <ul>
          <li><strong>For Services:</strong> Customers may cancel a service (e.g., subscription, appointment, or consulting session) before the scheduled start time. Cancellations made after this period may not be eligible for a refund.</li>
          <li><strong>For Products:</strong> Orders for physical products can be cancelled before the item has been shipped. Once shipped, the Return Policy applies.</li>
          <li>To request a cancellation, please contact us at <a href="mailto:thefitarjun@gmail.com">thefitarjun@gmail.com</a> with your Order ID.</li>
        </ul>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">02</span> Refund Policy</h2>
        <ul>
          <li><strong>Eligibility:</strong> Refunds are processed for eligible cancellations or if a service / product was not delivered as promised.</li>
          <li><strong>Processing Time:</strong> Once a refund is approved, it will be processed within <strong>5&ndash;7 business days</strong>. The amount will be credited back to the original method of payment (Credit Card, UPI, or Bank Account).</li>
          <li><strong>Late or Missing Refunds:</strong> If you haven't received a refund within 7&ndash;10 days, please check your bank account again or contact your credit card company. If the issue persists, please contact us.</li>
        </ul>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">03</span> Contact Us</h2>
        <p>If you have any questions about our Refund and Cancellation Policy, please contact us:</p>
        <div class="lg-contact">
          <div class="row">
            <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span class="lbl">Email</span>
            <span class="val"><a href="mailto:thefitarjun@gmail.com">thefitarjun@gmail.com</a></span>
          </div>
          <div class="row">
            <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span class="lbl">Phone</span>
            <span class="val"><a href="tel:+917905719992">79057 19992</a></span>
          </div>
        </div>

        <div class="lg-related">
          <a href="/privacy-policy/">
            <span class="lg-rel-h">Privacy Policy <span class="arr"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span></span>
            <span class="lg-rel-s">How we handle your data.</span>
          </a>
          <a href="/terms-and-conditions/">
            <span class="lg-rel-h">Terms &amp; Conditions <span class="arr"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span></span>
            <span class="lg-rel-s">The agreement when you use our services.</span>
          </a>
        </div>
      </div>

    </div>
  </section>


  
  <footer class="lg-foot">
    <div class="af-wrap">
      <p class="big">Copyright &copy; 2026 Arjun Fitness. All rights reserved.</p>
      <p>Owned and operated by Arjun Shah.</p>
      <div class="links">
        <a href="/refund-policy/">Refund Policy</a>
        <a href="/privacy-policy/">Privacy Policy</a>
        <a href="/terms-and-conditions/">Terms of Use</a>
      </div>
    </div>
  </footer>

</div>`;

export default function RefundPage() {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: BODY }} />
  );
}

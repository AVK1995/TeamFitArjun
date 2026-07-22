import { buildMetadata } from "@/lib/seo";
import "./terms.css";

export const dynamic = "force-static";
export const metadata = buildMetadata("terms");

/**
 * Static legal page. Body markup is the original WordPress HTML inlined as
 * a string constant; the per-page CSS is imported above. No interactivity,
 * so React state isn't needed — `dangerouslySetInnerHTML` here is safe
 * because the source is a trusted compile-time constant.
 */
const BODY = `<div class="af-root">

  
  <section class="lg-hero">
    <div class="af-wrap">

      <div class="lg-icon lg-icon-terms">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#C9954D"/>
              <stop offset="100%" stop-color="#9A6614"/>
            </linearGradient>
          </defs>
          
          <path class="doc-body" d="M22 14 H66 L80 28 V86 H22 Z"/>
          <path class="doc-corner" d="M66 14 V28 H80 Z"/>
          
          <line class="line" x1="34" y1="44" x2="60" y2="44"/>
          <line class="line" x1="34" y1="58" x2="68" y2="58"/>
          <line class="line" x1="34" y1="72" x2="56" y2="72"/>
          
          <polyline class="check check-1" points="26,42 29,46 32,40"/>
          <polyline class="check check-2" points="26,56 29,60 32,54"/>
          <polyline class="check check-3" points="26,70 29,74 32,68"/>
        </svg>
      </div>

      <div class="lg-kicker">
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Legal
      </div>
      <h1>Terms &amp; Conditions</h1>
      <p class="tag">By using teamfitarjun.com, you agree to the following terms.</p>
      <span class="lg-updated">
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Last updated: April 2026
      </span>

    </div>
  </section>


  
  <section class="lg-body">
    <div class="af-wrap">

      <div class="lg-section" data-rv>
        <h2><span class="num">01</span> Introduction</h2>
        <p>Welcome to teamfitarjun. By accessing our website <a href="https://teamfitarjun.com">www.teamfitarjun.com</a> and purchasing our products or services, you agree to be bound by the following Terms and Conditions.</p>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">02</span> Use of Services</h2>
        <ul>
          <li>You agree to use our website only for lawful purposes.</li>
          <li>You must provide accurate and complete information during the checkout or registration process.</li>
          <li>We reserve the right to refuse service or cancel orders at our sole discretion if we suspect fraudulent activity or violation of these terms.</li>
        </ul>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">03</span> Pricing and Payments</h2>
        <ul>
          <li>All prices listed on the website are in INR (₹).</li>
          <li>We reserve the right to change prices at any time without prior notice.</li>
          <li>Payments are processed securely via our payment gateway partners. We do not store your complete credit / debit card details on our servers.</li>
        </ul>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">04</span> Intellectual Property</h2>
        <p>All content on this website, including text, graphics, logos, and images, is the property of teamfitarjun and is protected by copyright laws. You may not reproduce or redistribute this content without our written permission.</p>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">05</span> Limitation of Liability</h2>
        <p>Arjun Fitness shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of our products or services, beyond the total amount paid by you for the specific order.</p>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">06</span> Governing Law</h2>
        <p>These Terms and Conditions are governed by the laws of India. Any disputes arising out of the use of this website shall be subject to the exclusive jurisdiction of the courts in Chennai, India.</p>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">07</span> Contact Information</h2>
        <p>If you have any questions regarding these Terms and Conditions, please contact us at:</p>
        <div class="lg-contact">
          <div class="row">
            <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span class="lbl">Email</span>
            <span class="val"><a href="mailto:thefitarjun@gmail.com">thefitarjun@gmail.com</a></span>
          </div>
        </div>

        <div class="lg-related">
          <a href="/privacy-policy/">
            <span class="lg-rel-h">Privacy Policy <span class="arr"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span></span>
            <span class="lg-rel-s">How we handle your data.</span>
          </a>
          <a href="/refund-policy/">
            <span class="lg-rel-h">Refund Policy <span class="arr"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span></span>
            <span class="lg-rel-s">Refunds &amp; cancellations.</span>
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

export default function TermsPage() {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: BODY }} />
  );
}

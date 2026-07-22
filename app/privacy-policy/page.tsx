import { buildMetadata } from "@/lib/seo";
import "./privacy.css";

export const dynamic = "force-static";
export const metadata = buildMetadata("privacy");

/**
 * Static legal page. Body markup is the original WordPress HTML inlined as
 * a string constant; the per-page CSS is imported above. No interactivity,
 * so React state isn't needed — `dangerouslySetInnerHTML` here is safe
 * because the source is a trusted compile-time constant.
 */
const BODY = `<div class="af-root">

  
  <section class="lg-hero">
    <div class="af-wrap">

      <div class="lg-icon lg-icon-shield">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="shGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#C9954D"/>
              <stop offset="100%" stop-color="#9A6614"/>
            </linearGradient>
          </defs>
          
          <path class="shield-body" d="M50 14 L80 24 V50 C80 68 66 80 50 86 C34 80 20 68 20 50 V24 Z"/>
          
          <polyline class="shield-check" points="36 50 46 60 66 40"/>
          
          <circle class="orbit orbit-1" cx="50" cy="50" r="3.5"/>
          <circle class="orbit orbit-2" cx="50" cy="50" r="2.5"/>
          <circle class="orbit orbit-3" cx="50" cy="50" r="3"/>
        </svg>
      </div>

      <div class="lg-kicker">
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Privacy
      </div>
      <h1>Privacy Policy</h1>
      <p class="tag">How we collect, use, and protect your information when you use teamfitarjun.com.</p>
      <span class="lg-updated">
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Last updated: April 2026
      </span>

    </div>
  </section>


  
  <section class="lg-body">
    <div class="af-wrap">

      <div class="lg-section" data-rv>
        <h2><span class="num">01</span> Information We Collect</h2>
        <p>When you visit our website or make a purchase, we collect the following personal information:</p>
        <ul>
          <li>Name</li>
          <li>Contact Information (Email address, Phone number)</li>
          <li>Billing and Shipping Address</li>
          <li>Payment Details (processed securely by our payment partners; we do not store CVV or PINs)</li>
        </ul>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">02</span> How We Use Your Information</h2>
        <p>We use your data strictly to:</p>
        <ul>
          <li>Process and deliver your orders.</li>
          <li>Communicate with you regarding your purchase or support inquiries.</li>
          <li>Improve our website and customer service.</li>
        </ul>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">03</span> Data Security</h2>
        <p>We implement appropriate security measures to protect your personal information from unauthorized access or disclosure. Your payment data is encrypted and processed through PCI-DSS compliant payment gateways.</p>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">04</span> Cookies</h2>
        <p>Our website uses cookies to enhance your browsing experience and analyze website traffic. You can choose to disable cookies through your browser settings, though this may affect some website functionality.</p>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">05</span> Third-Party Sharing</h2>
        <p>We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information with our business partners for analysis.</p>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">06</span> Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.</p>
      </div>

      <div class="lg-section" data-rv>
        <h2><span class="num">07</span> Contact Us</h2>
        <p>If you have questions about this Privacy Policy, please contact us at:</p>
        <div class="lg-contact">
          <div class="row">
            <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span class="lbl">Email</span>
            <span class="val"><a href="mailto:thefitarjun@gmail.com">thefitarjun@gmail.com</a></span>
          </div>
        </div>

        <div class="lg-related">
          <a href="/terms-and-conditions/">
            <span class="lg-rel-h">Terms &amp; Conditions <span class="arr"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span></span>
            <span class="lg-rel-s">The agreement when you use our services.</span>
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

export default function PrivacyPage() {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: BODY }} />
  );
}

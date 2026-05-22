/**
 * SEO metadata for every funnel route — sourced verbatim from
 * https://teamfitarjun.com on 2026-05-20 to match what's live in production
 * via the WordPress build. Update here as the live site's SEO evolves.
 */

interface PageSeo {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noindex?: boolean;
}

const SHARED_DESCRIPTION =
  "Custom coaching for Indian working men. Lose stubborn belly fat with home-cooked food. Built around your real life.";

export const seoMetadata: Record<string, PageSeo> = {
  home: {
    title: "Lose Belly Fat in 90 Days With Indian Food | Arjun Fitness",
    description:
      "Indian working men: lose 40-50% of stubborn belly fat in 90 days using regular roti, rice & home-cooked food. 1500+ clients transformed. Book ₹97 diagnostic call.",
    ogTitle: "Lose Belly Fat in 90 Days With Indian Food | Arjun Fitness",
    ogDescription:
      "Indian working men: lose 40-50% of stubborn belly fat in 90 days using regular roti, rice & home-cooked food. 1500+ clients transformed. Book ₹97 diagnostic call.",
    ogImage: "/OG Images/Home OG.png",
    ogType: "website",
  },
  checkout: {
    title: "Book Your Custom Execution Blueprint Call — ₹97 | Arjun Fitness",
    description:
      "Secure checkout for your 30-min 1:1 diagnostic call with Arjun Shah. ₹97. 100% money-back guarantee. UPI, Cards & NetBanking accepted.",
    ogTitle: "Book Your Custom Execution Blueprint Call — ₹97 | Arjun Fitness",
    ogDescription:
      "Secure checkout for your 30-min 1:1 diagnostic call with Arjun Shah. ₹97. 100% money-back guarantee. UPI, Cards & NetBanking accepted.",
    ogImage: "/OG Images/Checkout OG.png",
    ogType: "website",
    noindex: true,
  },
  bookACall: {
    title: "Pick Your Call Slot — Custom Execution Blueprint | Arjun Fitness",
    description:
      "Choose a 30-minute time slot that works for you. Confirm your booking and get the Zoom link via email. Limited slots open weekly.",
    ogTitle: "Pick Your Call Slot — Custom Execution Blueprint | Arjun Fitness",
    ogDescription:
      "Choose a 30-minute time slot that works for you. Confirm your booking and get the Zoom link via email. Limited slots open weekly.",
    ogImage: "/OG Images/Book A Call OG.png",
    ogType: "website",
    noindex: true,
  },
  thankYou: {
    title: "Booking Confirmed | Complete Your Diagnostic — Arjun Fitness",
    description: SHARED_DESCRIPTION,
    ogTitle: "Thank You | Arjun Fitness",
    ogDescription: SHARED_DESCRIPTION,
    ogImage: "/OG Images/Thank You OG.png",
    ogType: "website",
    noindex: true,
  },
  paymentFailed: {
    title: "Payment Could Not Be Processed — Arjun Fitness",
    description: SHARED_DESCRIPTION,
    ogTitle: "Payment Failed | Arjun Fitness",
    ogDescription: SHARED_DESCRIPTION,
    ogType: "website",
    noindex: true,
  },
  privacy: {
    title: "Privacy Policy | Arjun Fitness",
    description: SHARED_DESCRIPTION,
    ogTitle: "Privacy Policy | Arjun Fitness",
    ogDescription: SHARED_DESCRIPTION,
    ogType: "website",
  },
  terms: {
    title: "Terms & Conditions | Arjun Fitness",
    description: SHARED_DESCRIPTION,
    ogTitle: "Terms And Conditions | Arjun Fitness",
    ogDescription: SHARED_DESCRIPTION,
    ogType: "website",
  },
  refund: {
    title: "Refund Policy & 100% Money-Back Guarantee | Arjun Fitness",
    description: SHARED_DESCRIPTION,
    ogTitle: "Refund Policy | Arjun Fitness",
    ogDescription: SHARED_DESCRIPTION,
    ogType: "website",
  },
};

export type PageKey =
  | "home"
  | "checkout"
  | "bookACall"
  | "thankYou"
  | "paymentFailed"
  | "privacy"
  | "terms"
  | "refund";

import type { Metadata } from "next";

export function buildMetadata(key: PageKey): Metadata {
  const seo = seoMetadata[key];
  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      type: seo.ogType ?? "website",
      ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.ogTitle,
      description: seo.ogDescription,
      ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    },
    robots: seo.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

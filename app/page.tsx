import { UtmCapture } from "@/components/UtmCapture";
import { buildMetadata } from "@/lib/seo";
import { LandingView } from "./LandingView";
import "./landing.css";

export const dynamic = "force-static";
export const metadata = buildMetadata("home");

export default function LandingPage() {
  return (
    <>
      {/* Preload the hero video thumbnail (the LCP element). It's painted via a
          CSS background-image, which browsers discover late; preloading it at
          high priority lets it download immediately and improves LCP on mobile. */}
      <link
        rel="preload"
        as="image"
        href="/Landing%20Thumbnail.webp"
        fetchPriority="high"
      />
      <UtmCapture />
      <LandingView />
    </>
  );
}

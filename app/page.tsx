import { UtmCapture } from "@/components/UtmCapture";
import { buildMetadata } from "@/lib/seo";
import { LandingView } from "./LandingView";
import "./landing.css";

export const dynamic = "force-static";
export const metadata = buildMetadata("home");

export default function LandingPage() {
  return (
    <>
      <UtmCapture />
      <LandingView />
    </>
  );
}

import Script from "next/script";
import { UtmCapture } from "@/components/UtmCapture";
import { buildMetadata } from "@/lib/seo";
import { BookACallView } from "./BookACallView";
import "./bookacall.css";

export const dynamic = "force-static";
export const metadata = buildMetadata("bookACall");

export default function BookACallPage() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://assets.calendly.com/assets/external/widget.css"
      />
      <UtmCapture />
      <BookACallView />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        id="calendly-widget-script"
      />
    </>
  );
}

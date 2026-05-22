import { UtmCapture } from "@/components/UtmCapture";
import { buildMetadata } from "@/lib/seo";
import { CheckoutView } from "./CheckoutView";
import "./checkout.css";

export const dynamic = "force-static";
export const metadata = buildMetadata("checkout");

export default function CheckoutPage() {
  return (
    <>
      <UtmCapture />
      <CheckoutView />
      <style dangerouslySetInnerHTML={{ __html: CHECKOUT_OVERRIDES }} />
    </>
  );
}

/**
 * Per-page overrides on top of the source CSS. Keeps the original design
 * intact — just removes the dark card backgrounds on the form / order-summary
 * columns so they sit transparently on the page.
 */
const CHECKOUT_OVERRIDES = `
.af-root .co-card {
  background: transparent !important;
  box-shadow: none !important;
}
`;

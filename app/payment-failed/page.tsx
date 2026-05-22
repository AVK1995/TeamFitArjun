import { UtmCapture } from "@/components/UtmCapture";
import { buildMetadata } from "@/lib/seo";
import { PaymentFailedView } from "./PaymentFailedView";
import "./paymentfailed.css";

export const dynamic = "force-static";
export const metadata = buildMetadata("paymentFailed");

export default function PaymentFailedPage() {
  return (
    <>
      <UtmCapture />
      <PaymentFailedView />
    </>
  );
}

import { NextResponse } from "next/server";
import { isProductionServer } from "@/lib/tracking-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Forwards a payment-failure report (name, email, message, screenshot)
 * to Pabbly as multipart/form-data. The Pabbly workflow handles emailing
 * Arjun + saving to the CRM. Uses the main PABBLY_WEBHOOK_URL — payment
 * issues are routed alongside successful purchases (the `kind` field below
 * lets the Pabbly workflow branch).
 *
 * Falls back to no-op (still returns 200) if no webhook is configured —
 * the user-facing UX is "we received your report" either way.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Production-host gate: payment-issue reports from Vercel preview /
  // localhost are accepted (the user sees "we received your report") but
  // NEVER forwarded to Pabbly.
  if (!isProductionServer(request)) {
    console.log("[payment-issue] tracking suppressed — non-production host");
    return NextResponse.json({ success: true, forwarded: false });
  }

  const url = process.env.PABBLY_WEBHOOK_URL;

  if (!url) {
    console.warn(
      "[payment-issue] PABBLY_WEBHOOK_URL not set in .env.local — accepting but NOT forwarding to Pabbly",
    );
    return NextResponse.json({ success: true, forwarded: false });
  }

  // Pass through the multipart form-data so Pabbly receives the file
  // attachment intact.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid form data" },
      { status: 400 },
    );
  }

  // Add a server timestamp + kind tag so Pabbly can branch.
  formData.append("kind", "payment_issue");
  formData.append("submitted_at", new Date().toISOString());

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });
    const responseText = await res.text().catch(() => "<no body>");
    if (!res.ok) {
      console.warn(
        `[payment-issue] Pabbly returned ${res.status}: ${responseText.slice(0, 200)}`,
      );
      return NextResponse.json(
        { success: false, error: "Forward failed", status: res.status },
        { status: 502 },
      );
    }
    console.log(
      `[payment-issue] forwarded OK — Pabbly responded ${res.status}: ${responseText.slice(0, 120)}`,
    );
    return NextResponse.json({ success: true, forwarded: true });
  } catch (err) {
    console.error("[payment-issue] forward failed", err);
    return NextResponse.json(
      { success: false, error: "Forward error" },
      { status: 502 },
    );
  }
}

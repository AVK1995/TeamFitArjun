import { NextResponse } from "next/server";
import { clientConfig } from "@/client.config";
import { isProductionServer } from "@/lib/tracking-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface QuizRequest {
  customer?: Record<string, string>;
  orderId?: string;
  paymentId?: string;
  calendly?: {
    eventUri?: string;
    inviteeUri?: string;
    scheduledAt?: string;
  };
  answers?: Record<string, string | string[]>;
}

/**
 * Receive the post-booking "Chhod Yaar Diagnostic" quiz answers.
 * Forwards to Pabbly so Arjun has the context before the call.
 *
 * If PABBLY_QUIZ_WEBHOOK_URL is not set, falls back to the main
 * PABBLY_WEBHOOK_URL with a `kind: "quiz"` field so the Pabbly
 * workflow can branch.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: QuizRequest;
  try {
    body = (await request.json()) as QuizRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Production-host gate: quiz submissions from Vercel preview / localhost
  // are accepted (so the UI shows "submitted") but NEVER forwarded to Pabbly.
  if (!isProductionServer(request)) {
    console.log("[quiz] tracking suppressed — non-production host");
    return NextResponse.json({ success: true, forwarded: false });
  }

  // `||` (not `??`) so an empty-string env value also falls back to the main webhook
  const url =
    process.env.PABBLY_QUIZ_WEBHOOK_URL || process.env.PABBLY_WEBHOOK_URL;

  if (!url) {
    console.warn(
      "[quiz] No Pabbly webhook configured (PABBLY_QUIZ_WEBHOOK_URL or PABBLY_WEBHOOK_URL must be set in .env.local) — accepting but NOT forwarding to Pabbly",
    );
    return NextResponse.json({ success: true, forwarded: false });
  }

  console.log(
    `[quiz] forwarding to Pabbly (${process.env.PABBLY_QUIZ_WEBHOOK_URL ? "PABBLY_QUIZ_WEBHOOK_URL" : "PABBLY_WEBHOOK_URL fallback"})`,
  );

  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: clientConfig.event.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: clientConfig.event.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Flatten answers into a Pabbly-friendly shape (one key per question).
  const flatAnswers: Record<string, string> = {};
  if (body.answers) {
    for (const [key, value] of Object.entries(body.answers)) {
      flatAnswers[`q_${key}`] = Array.isArray(value) ? value.join("; ") : value;
    }
  }

  const fullName = [body.customer?.firstName, body.customer?.lastName]
    .filter(Boolean)
    .join(" ");

  const payload = {
    kind: "quiz",
    // Customer (captured at checkout, same person who booked the Calendly slot)
    first_name: body.customer?.firstName ?? "",
    last_name: body.customer?.lastName ?? "",
    full_name: fullName,
    email: body.customer?.email ?? "",
    phone: body.customer?.phone ?? "",
    city: body.customer?.city ?? "",
    country_code: body.customer?.countryCode ?? "",
    // Razorpay refs
    order_id: body.orderId ?? "",
    payment_id: body.paymentId ?? "",
    // Calendly booking refs — Pabbly can call Calendly API with these to
    // fetch the actual slot time + invitee metadata for personalised emails.
    calendly_event_uri: body.calendly?.eventUri ?? "",
    calendly_invitee_uri: body.calendly?.inviteeUri ?? "",
    calendly_scheduled_at: body.calendly?.scheduledAt ?? "",
    // Submission timestamp
    submitted_date: dateFormatter.format(now),
    submitted_time: timeFormatter.format(now),
    submitted_timestamp: now.toISOString(),
    // 10 quiz answers, one column each — q_body_snapshot, q_training_history, ...
    ...flatAnswers,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const responseText = await res.text().catch(() => "<no body>");
    if (!res.ok) {
      console.warn(
        `[quiz] Pabbly returned ${res.status}: ${responseText.slice(0, 200)}`,
      );
      return NextResponse.json(
        { success: false, error: "Forward failed", status: res.status },
        { status: 502 },
      );
    }
    console.log(
      `[quiz] forwarded OK — Pabbly responded ${res.status}: ${responseText.slice(0, 120)}`,
    );
    return NextResponse.json({ success: true, forwarded: true });
  } catch (err) {
    console.error("[quiz] forward failed (network/exception):", err);
    return NextResponse.json(
      { success: false, error: "Forward error" },
      { status: 502 },
    );
  }
}

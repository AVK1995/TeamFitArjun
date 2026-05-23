import type { CustomerPayload, UtmPayload } from "./types";

/**
 * Fire-and-forget POST to the Pabbly Connect webhook.
 * Failures are logged but never surface to the user — payment verification
 * is the only thing that gates the success redirect.
 */
export async function firePabblyWebhook(args: {
  customer: CustomerPayload;
  utm: UtmPayload;
  paymentId: string;
  orderId: string;
  amount: string;
  currency: string;
  timezone: string;
  coupon?: string;
}): Promise<void> {
  const url = process.env.PABBLY_WEBHOOK_URL;
  if (!url) {
    console.warn("[pabbly] PABBLY_WEBHOOK_URL not set — skipping");
    return;
  }

  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: args.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: args.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const fullName = [args.customer.firstName, args.customer.lastName]
    .filter(Boolean)
    .join(" ");

  const payload = {
    first_name: args.customer.firstName,
    last_name: args.customer.lastName,
    full_name: fullName,
    email: args.customer.email,
    phone: args.customer.phone,
    city: args.customer.city,
    state: args.customer.state ?? "",
    zip_code: args.customer.zipCode ?? "",
    country_code: args.customer.countryCode,
    payment_id: args.paymentId,
    order_id: args.orderId,
    amount: args.amount,
    currency: args.currency,
    coupon: args.coupon ?? "",
    payment_date: dateFormatter.format(now),
    payment_time: timeFormatter.format(now),
    payment_timestamp: now.toISOString(),
    utm_source: args.utm.utm_source ?? "",
    utm_medium: args.utm.utm_medium ?? "",
    utm_campaign: args.utm.utm_campaign ?? "",
    utm_content: args.utm.utm_content ?? "",
    utm_term: args.utm.utm_term ?? "",
    gclid: args.utm.gclid ?? "",
    fbclid: args.utm.fbclid ?? "",
    referrer: args.utm.referrer ?? "",
    landing_url: args.utm.landing_url ?? "",
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      console.warn(
        `[pabbly] webhook returned ${res.status} for order ${args.orderId} — body: ${text.slice(0, 200)} — payload: ${JSON.stringify(payload)}`,
      );
      return;
    }
    // Log the full payload on success so every Pabbly fire can be inspected
    // in Vercel logs. Helpful for reconciling missing rows + debugging
    // mapping issues in the Pabbly workflow.
    console.log(
      `[pabbly] OK order=${args.orderId} payment=${args.paymentId} payload=${JSON.stringify(payload)}`,
    );
  } catch (err) {
    console.warn(
      `[pabbly] webhook failed for order ${args.orderId} — payload: ${JSON.stringify(payload)}`,
      err,
    );
  }
}

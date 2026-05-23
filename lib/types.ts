/** Shared types for the funnel — API routes, client payloads, EMQ data. */

export interface CustomerPayload {
  firstName: string;
  lastName: string;
  email: string;
  /** Full E.164 phone with +country code, e.g. "+919876543210" */
  phone: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "IN" */
  countryCode: string;
  city: string;
  /** Optional state (helps EMQ score) */
  state?: string;
  /** Optional postal/PIN code (helps EMQ score) */
  zipCode?: string;
}

export interface UtmPayload {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  landing_url?: string;
}

export interface CreateOrderRequest {
  amount: number;
  currency: string;
  /** Optional coupon code applied client-side */
  coupon?: string;
  /** Forwarded so the order notes carry the full customer payload */
  customer?: Partial<CustomerPayload>;
  /**
   * UTM + click-id + landing_url. Stored in Razorpay order `notes` at order
   * creation time, so the webhook fallback can rebuild the full Pabbly
   * payload server-side even when the browser-side verify-payment never lands.
   */
  utm?: UtmPayload;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  /** Deterministic event_id used for both browser Pixel and server CAPI dedup */
  eventId: string;
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  customer: CustomerPayload;
  utm: UtmPayload;
  /** Facebook click-id and browser-id cookies (forwarded for CAPI) */
  fbc?: string;
  fbp?: string;
  /** URL the client was on when the purchase fired — `window.location.href` */
  eventSourceUrl?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  paymentId?: string;
  /** Echo back the event_id (Razorpay payment_id) for the client's records */
  eventId?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

/**
 * Razorpay checkout.js global types (loaded via <Script> in app/layout.tsx).
 */

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: {
    escape?: boolean;
    ondismiss?: () => void;
  };
  handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
}

export interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id: string;
      payment_id: string;
    };
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export {};

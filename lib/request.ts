/**
 * Helpers for extracting client IP and User-Agent from a Next.js Request.
 * These are required for Meta CAPI user_data to score EMQ.
 */

export function extractClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    // First IP in the comma-separated list is the original client.
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "";
}

export function extractUserAgent(request: Request): string {
  return request.headers.get("user-agent") ?? "";
}

export function extractEventSourceUrl(request: Request, fallback: string): string {
  return request.headers.get("referer") ?? fallback;
}

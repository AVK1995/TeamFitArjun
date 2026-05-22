import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React StrictMode double-renders in dev which amplifies hydration races
  // between Next.js's AsyncMetadataOutlet and the dev error overlay. Off in
  // dev, doesn't affect prod behavior.
  reactStrictMode: false,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["libphonenumber-js"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

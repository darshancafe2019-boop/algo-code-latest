/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Permanent correction for development HMR hot-chunk freshness and production static asset caching
  async headers() {
    return [
      {
        // In production: immutable long-term caching for fingerprinted Next.js static assets.
        // In development: disable caching so Webpack module factory IDs and HMR chunks are never stale.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: isProd
              ? "public, max-age=31536000, immutable"
              : "no-cache, no-store, max-age=0, must-revalidate",
          },
          ...(isProd
            ? []
            : [
                { key: "Pragma", value: "no-cache" },
                { key: "Expires", value: "0" },
              ]),
        ],
      },
      {
        // Never cache HTML pages, RSC payloads, or dynamic API routes to prevent stale chunk 404 mismatches
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, max-age=0, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
  webpack(config, { isServer, dev }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;

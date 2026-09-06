/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
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

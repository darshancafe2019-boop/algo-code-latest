/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;

import type { NextConfig } from "next";

const backendUrl = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/sanctum/csrf-cookie",
        destination: `${backendUrl}/sanctum/csrf-cookie`,
      },
    ];
  },
};

export default nextConfig;

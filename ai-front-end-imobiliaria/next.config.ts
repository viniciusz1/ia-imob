import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "https://ai-backendd-imobiliaria.vercel.app/api/v1/:path*",
      },
      {
        source: "/sanctum/csrf-cookie",
        destination: "https://ai-backendd-imobiliaria.vercel.app/sanctum/csrf-cookie",
      },
    ];
  },
};

export default nextConfig;

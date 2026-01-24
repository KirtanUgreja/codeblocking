import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Localhost only - no external access
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000'],
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove "export" to enable dynamic routes
  // For static hosting, deploy with `next start` or serverless
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
  trailingSlash: true,
};

export default nextConfig;

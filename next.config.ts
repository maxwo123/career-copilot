import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // /timeline was renamed to /applications (2026-08-18).
    return [
      { source: "/timeline", destination: "/applications", permanent: true },
    ];
  },
};

export default nextConfig;

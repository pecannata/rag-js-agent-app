import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [],
  experimental: {
    // For large file uploads in API routes
    serverComponentsExternalPackages: ['oracledb']
  },
};

export default nextConfig;

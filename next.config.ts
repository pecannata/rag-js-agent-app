import type { NextConfig } from "next";
import { readFileSync } from 'fs';
import { join } from 'path';

// Load build environment variables if they exist
let buildEnv: Record<string, string> = {};
try {
  const envBuildPath = join(process.cwd(), '.env.build');
  const envContent = readFileSync(envBuildPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      buildEnv[key] = value;
    }
  });
} catch {
  // .env.build doesn't exist, which is fine
}

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [],
  env: {
    ...buildEnv,
  },
  // Handle HTTPS in production
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

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
};

export default nextConfig;

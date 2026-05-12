import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow long-running sync API route
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
};

export default nextConfig;

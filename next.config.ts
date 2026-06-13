import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['pg'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'ecotracker-app.azurewebsites.net'],
    },
  },
};

export default nextConfig;

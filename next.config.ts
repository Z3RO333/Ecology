import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @databricks/sql pulls in native/non-ESM deps (e.g. lz4) that Turbopack
  // cannot bundle. Keep it external so it is require()d at runtime instead.
  serverExternalPackages: ['@databricks/sql'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'ecotracker-app.azurewebsites.net'],
    },
  },
};

export default nextConfig;

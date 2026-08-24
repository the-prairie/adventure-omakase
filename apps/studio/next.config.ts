import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  transpilePackages: [
    '@adventure-omakase/api-client',
    '@adventure-omakase/contracts',
    '@adventure-omakase/design-tokens',
  ],
};

export default nextConfig;

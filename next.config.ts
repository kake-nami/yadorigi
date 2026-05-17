import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Native node modules must not be bundled by Next.js
  serverExternalPackages: ['better-sqlite3', 'better-sqlite3-multiple-ciphers', 'keytar'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.twimg.com',
      },
    ],
  },
}

export default nextConfig

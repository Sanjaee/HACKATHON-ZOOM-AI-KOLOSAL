import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.pinimg.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'axiomtrading.sfo3.cdn.digitaloceanspaces.com' },
      { protocol: 'http', hostname: 'localhost', port: '5000' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
  // Ensure API routes work correctly in standalone mode
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // For Next.js standalone mode, server-side env vars are available at runtime
  // We don't need to expose KOLOSAL_API_KEY via env config since it's server-only
  // The env var will be available via process.env.KOLOSAL_API_KEY at runtime
};

export default nextConfig;

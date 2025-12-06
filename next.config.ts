import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: true,
  // Enable standalone output for Docker deployment
  // Vercel will ignore this and use its own optimized build process
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
  // Ensure API routes work correctly
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Server-side env vars are available at runtime via process.env
  // Make sure to set them in Vercel environment variables
};

export default nextConfig;

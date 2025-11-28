/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai', // For your existing/older articles
      },
      {
        protocol: 'https',
        hostname: 'fal.media', // For new Fal.ai images
      },
      {
        protocol: 'https',
        hostname: 'v3.fal.media', // Common Fal.ai CDN
      }
    ],
  },
};

export default nextConfig;
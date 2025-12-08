/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 🛡️ CRITICAL FIX: Disable server-side optimization
    // This stops the "resolved to private ip" crash in Docker/Localhost
    unoptimized: true, 
    
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v3b.fal.media',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fal.media', // Add this too, sometimes Fal redirects here
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
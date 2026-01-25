/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  reactStrictMode: true,
  
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
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  }, 

  async redirects() {
    return [
      {
        // ✅ Redirect old WP-style URLs to your new News structure
        source: '/2025/:month/:day/:slug',
        destination: '/news/:slug',
        permanent: true,
      },
      {
        // ✅ Kill the "Sample Page" and "Hello World" stubs
        source: '/sample-page',
        destination: '/',
        permanent: true,
      },
      {
        // ✅ Cleanup broken links found in Search Console reports
        source: '/hello-world',
        destination: '/',
        permanent: true,
      },
      {
        // ✅ Fixes the broken ampersand URL found in your crawl data
        source: '/&',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
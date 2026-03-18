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
      // ✅ Cache Control: Homepage (revalidate every 60 seconds)
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=3600',
          },
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
      // ✅ Cache Control: Article pages (cache for 60 seconds)
      {
        source: '/news/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=86400',
          },
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
      // ✅ Cache Control: API endpoints (cache for 60 seconds)
      {
        source: '/api/articles/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=3600',
          },
        ],
      },
      // ✅ Cache Control: Other assets (longer cache for archives)
      {
        source: '/archive',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=86400',
          },
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
      // ✅ Default headers for all other routes
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
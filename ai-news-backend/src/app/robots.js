import { MetadataRoute } from 'next';

export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://coinmarketbuzz.com';

  return {
    rules: [
      {
        // ✅ 1. General Rules for All Bots
        userAgent: '*',
        allow: [
          '/',
          '/_next/static/', // Allow JS/CSS bundles
          '/_next/image/',  // Allow optimized images
        ],
        disallow: [
          '/api/',           // Protect internal API logic
          '/admin/',         // Protect admin dashboard
          '/private/',       // Protect internal/staging folders
          '/*?search=',      // Avoid indexing search results
          '/_next/data/',    // Avoid duplicate content from Next.js data
        ],
      },
      {
        // ✅ 2. Specific Access for Googlebot-News
        // Ensuring the news crawler has full priority access
        userAgent: 'Googlebot-News',
        allow: '/',
      },
    ],
    // ✅ 3. Points only to the Master Sitemap Index
    // This index (/sitemap.xml) will guide bots to both your main and news feeds
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
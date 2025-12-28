import { MetadataRoute } from 'next';

export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://coinmarketbuzz.com';

  return {
    rules: [
      {
        // ✅ 1. General Rules for All Bots
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // Protect internal API logic
          '/admin/',         // Protect admin dashboard
          '/private/',       // Protect internal/staging folders
          '/*?search=',      // Avoid indexing internal search results to prevent duplicate content
        ],
      },
      {
        // ✅ 2. Specific Rules for Googlebot-News (Critical for Ranking)
        // This explicitly tells Google News bots they have full access
        userAgent: 'Googlebot-News',
        allow: '/',
      },
    ],
    // ✅ 3. Sitemaps: List both for indexing and news ranking
    sitemap: [
      `${baseUrl}/sitemap.xml`,        // Main site directory
      `${baseUrl}/news-sitemap.xml`,   // Google News-specific feed (48-hour rule)
    ],
  };
}
export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://coinmarketbuzz.com';

  return {
    rules: [
      {
        allow: [
          '/',
          '/_next/static/', // Allow JS/CSS bundles
          '/_next/image/', // Allow optimized images
          '/_next/data/', 
        ],
        disallow: [
          '/api/',           // Protect internal API logic
          '/admin/',         // Protect admin dashboard
          '/private/',       // Protect internal/staging folders
          '/*?search=',
          '/*?q='
        ],
      },
      {
        userAgent: 'Googlebot-News',
        allow: '/',
      },
    ],
    // ✅ 3. Points only to the Master Sitemap Index
    // This index (/sitemap.xml) will guide bots to both your main and news feeds
    host: baseUrl,
    sitemap: [`${baseUrl}/sitemap.xml`], 
  };
}

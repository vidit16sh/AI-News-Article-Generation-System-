import prisma from '@/lib/prisma';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  // Google News specific: Only articles from last 48 hours
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const articles = await prisma.generatedArticle.findMany({
    where: { 
      status: 'PUBLISHED',
      publishAt: { gte: twoDaysAgo }
    },
    orderBy: { publishAt: 'desc' },
    include: { originalNews: { include: { category: true } } }
  });

  const newsUrls = articles.map(article => {
    return `
  <url>
    <loc>${baseUrl}/news/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>CoinMarketBuzz</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(article.publishAt).toISOString()}</news:publication_date>
      <news:title>${article.headline.replace(/&/g, '&amp;')}</news:title>
      <news:keywords>${article.keywords.slice(0, 5).join(', ')}</news:keywords>
    </news:news>
  </url>`;
  }).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${newsUrls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=3600'
    }
  });
}
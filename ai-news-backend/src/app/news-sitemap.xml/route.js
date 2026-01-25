import prisma from '@/lib/prisma';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://coinmarketbuzz.com';
  
  // ✅ Google News: Only articles from the last 48 hours
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const articles = await prisma.generatedArticle.findMany({
    where: { 
      status: 'PUBLISHED',
      publishAt: { gte: twoDaysAgo }
    },
    orderBy: { publishAt: 'desc' },
    include: { originalNews: { include: { category: true } } }
  });

  const escapeXml = (unsafe) => {
    return unsafe.replace(/[<>&"']/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&apos;';
        default: return c;
      }
    });
  };

  const newsUrls = articles.map(article => {
    const publishDate = new Date(article.publishAt || article.createdAt).toISOString();
    // ✅ Ensure absolute image URLs for Google News thumbnails
    const absoluteImage = article.imageUrl?.startsWith('http') 
      ? article.imageUrl 
      : `${baseUrl}${article.imageUrl || '/default-news.jpg'}`;

    return `
  <url>
    <loc>${baseUrl}/news/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>CoinMarketBuzz</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${publishDate}</news:publication_date>
      <news:title>${escapeXml(article.headline)}</news:title>
    </news:news>
    ${article.imageUrl ? `
    <image:image>
      <image:loc>${escapeXml(absoluteImage)}</image:loc>
    </image:image>` : ''}
  </url>`;
  }).join('');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"> 
  ${newsUrls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // ✅ Cache-Control with stale-while-revalidate for Next.js 15 performance
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=60'
    }
  });
}
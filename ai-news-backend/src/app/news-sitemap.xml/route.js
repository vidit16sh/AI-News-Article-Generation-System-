import prisma from '@/lib/prisma';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://coinmarketbuzz.com';
  
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const articles = await prisma.generatedArticle.findMany({
    where: { 
      status: 'PUBLISHED',
      publishAt: { gte: twoDaysAgo },
      confidenceScore: { gte: 0.8 },
      originalityScore: { gte: 0.65 },
    },
    orderBy: { publishAt: 'desc' },
    take: 1000,
    include: { originalNews: { include: { category: true } } }
  });

  const escapeXml = (unsafe = '') => {
    return String(unsafe).replace(/[<>&"']/g, (c) => {
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

  const normalizeHeadline = (headline = "") =>
    String(headline)
      .toLowerCase()
      .replace(/:\s*a skeptical investigation.*$/i, "")
      .replace(/\s+amid\s+extreme\s+fear(?:\s+market)?/gi, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const seen = new Set();
  const deduped = [];
  for (const article of articles) {
    const key = normalizeHeadline(article.headline);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(article);
  }

  const newsUrls = deduped
  .filter((article) => !!article.slug && !!article.headline)
  .map(article => {
    const publishDate = new Date(article.publishAt || article.createdAt).toISOString();
    const absoluteImage = article.imageUrl?.startsWith('http') 
      ? article.imageUrl 
      : `${baseUrl}${article.imageUrl || '/default-news.jpg'}`;

    return `
  <url>
    <loc>${escapeXml(`${baseUrl}/news/${article.slug}`)}</loc>
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

  // 🛡️ CRITICAL FIX: You MUST include the xmlns:image line below
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${newsUrls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8', // Added charset for better browser parsing
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=600'
    }
  });
}

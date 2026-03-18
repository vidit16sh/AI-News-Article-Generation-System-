import prisma from '@/lib/prisma';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://coinmarketbuzz.com';
  const lookbackHours = Number(process.env.NEWS_SITEMAP_LOOKBACK_HOURS || 48);
  // 🔴 PHASE 1: Lowered thresholds to include more articles in news feed (faster discovery)
  const minConfidence = Number(process.env.NEWS_SITEMAP_MIN_CONFIDENCE || 0.65);
  const minOriginality = Number(process.env.NEWS_SITEMAP_MIN_ORIGINALITY || 0.55);
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  const articles = await prisma.generatedArticle.findMany({
    where: { 
      status: 'PUBLISHED',
      publishAt: { gte: since },
      confidenceScore: { gte: minConfidence },
      originalityScore: { gte: minOriginality },
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

  const validNewsArticles = deduped
  .filter((article) => !!article.slug && !!article.headline && /^[a-z0-9-]+$/.test(article.slug))
  .map(article => {
    const publishDate = new Date(article.publishAt || article.createdAt).toISOString();
    const lastmodDate = new Date(article.updatedAt || article.publishAt || article.createdAt).toISOString();
    const absoluteImage = article.imageUrl?.startsWith('http') 
      ? article.imageUrl 
      : `${baseUrl}${article.imageUrl || '/default-news.jpg'}`;
    
    // 🔴 PHASE 1: Include keywords for Google News categorization
    const keywordsList = Array.isArray(article.keywords) && article.keywords.length > 0
      ? article.keywords.join(", ")
      : [article.tags?.[0], "Crypto News"].filter(Boolean).join(", ");

    return `
  <url>
    <loc>${escapeXml(`${baseUrl}/news/${article.slug}`)}</loc>
    <lastmod>${lastmodDate}</lastmod>
    <news:news>
      <news:publication>
        <news:name>CoinMarketBuzz</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${publishDate}</news:publication_date>
      <news:title>${escapeXml(article.headline)}</news:title>
      ${keywordsList ? `<news:keywords>${escapeXml(keywordsList)}</news:keywords>` : ''}
    </news:news>
    ${article.imageUrl ? `
    <image:image>
      <image:loc>${escapeXml(absoluteImage)}</image:loc>
    </image:image>` : ''}
  </url>`;
  });

  // Google rejects empty <urlset>. Keep one valid fallback URL if filters produce zero items.
  let newsUrls = validNewsArticles.join('');
  if (!newsUrls) {
    const fallbackLatest = await prisma.generatedArticle.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { publishAt: 'desc' },
      select: { slug: true, updatedAt: true },
    });

    if (fallbackLatest?.slug && /^[a-z0-9-]+$/.test(fallbackLatest.slug)) {
      const lastmod = new Date(fallbackLatest.updatedAt || Date.now()).toISOString();
      newsUrls = `
  <url>
    <loc>${escapeXml(`${baseUrl}/news/${fallbackLatest.slug}`)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    } else {
      newsUrls = `
  <url>
    <loc>${escapeXml(`${baseUrl}/`)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`;
    }
  }

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

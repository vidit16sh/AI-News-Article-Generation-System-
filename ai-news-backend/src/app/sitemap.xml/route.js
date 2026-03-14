import prisma from '@/lib/prisma';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://coinmarketbuzz.com';
  const fallbackStaticLastmod =
    process.env.SITEMAP_STATIC_LASTMOD ||
    process.env.BUILD_TIMESTAMP ||
    '2026-01-01T00:00:00.000Z';
  const staticLastmodIso = new Date(fallbackStaticLastmod).toISOString();

  const mainMinConfidence = Number(process.env.MAIN_SITEMAP_MIN_CONFIDENCE || 0.7);
  const newsLookbackHours = Number(process.env.NEWS_SITEMAP_LOOKBACK_HOURS || 72);
  const newsMinConfidence = Number(process.env.NEWS_SITEMAP_MIN_CONFIDENCE || 0.7);
  const newsMinOriginality = Number(process.env.NEWS_SITEMAP_MIN_ORIGINALITY || 0.6);
  const newsSince = new Date(Date.now() - newsLookbackHours * 60 * 60 * 1000);

  const [mainLatest, newsLatest] = await Promise.all([
    prisma.generatedArticle.findFirst({
      where: {
        status: 'PUBLISHED',
        confidenceScore: { gte: mainMinConfidence },
      },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
    prisma.generatedArticle.findFirst({
      where: {
        status: 'PUBLISHED',
        publishAt: { gte: newsSince },
        confidenceScore: { gte: newsMinConfidence },
        originalityScore: { gte: newsMinOriginality },
      },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
  ]);

  const mainLastmod = mainLatest?.updatedAt?.toISOString() || staticLastmodIso;
  const newsLastmod = newsLatest?.updatedAt?.toISOString() || staticLastmodIso;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/main-sitemap.xml</loc>
    <lastmod>${mainLastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/news-sitemap.xml</loc>
    <lastmod>${newsLastmod}</lastmod>
  </sitemap>
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=600',
    },
  });
}

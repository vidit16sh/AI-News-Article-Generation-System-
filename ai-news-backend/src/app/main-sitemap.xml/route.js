import prisma from '@/lib/prisma';

const escapeXml = (unsafe = '') =>
  unsafe.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return char;
    }
  });

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://coinmarketbuzz.com';
  const minConfidence = Number(process.env.MAIN_SITEMAP_MIN_CONFIDENCE || 0.7);
  const fallbackStaticLastmod = process.env.SITEMAP_STATIC_LASTMOD || process.env.BUILD_TIMESTAMP || new Date().toISOString();
  const staticLastmodIso = new Date(fallbackStaticLastmod).toISOString();

  const articles = await prisma.generatedArticle.findMany({
    where: {
      status: 'PUBLISHED',
      confidenceScore: { gte: minConfidence },
    },
    orderBy: { publishAt: 'desc' },
    take: 49000,
    select: { slug: true, updatedAt: true },
  });

  const validArticles = articles.filter(
    (article) => !!article.slug && /^[a-z0-9-]+$/.test(article.slug)
  );

  const latestArticleLastmodIso =
    validArticles.length > 0
      ? validArticles[0].updatedAt.toISOString()
      : staticLastmodIso;

  const staticRouteDefs = [
    { route: '', priority: '1.0', changefreq: 'hourly', lastmod: latestArticleLastmodIso },
    { route: '/about', priority: '0.5', changefreq: 'monthly', lastmod: staticLastmodIso },
    { route: '/contact', priority: '0.5', changefreq: 'monthly', lastmod: staticLastmodIso },
    { route: '/authors', priority: '0.6', changefreq: 'weekly', lastmod: staticLastmodIso },
    { route: '/archive', priority: '0.8', changefreq: 'daily', lastmod: latestArticleLastmodIso },
    { route: '/category/crypto', priority: '0.8', changefreq: 'daily', lastmod: latestArticleLastmodIso },
    { route: '/category/bitcoin', priority: '0.8', changefreq: 'daily', lastmod: latestArticleLastmodIso },
    { route: '/category/ethereum', priority: '0.8', changefreq: 'daily', lastmod: latestArticleLastmodIso },
    { route: '/category/finance', priority: '0.8', changefreq: 'daily', lastmod: latestArticleLastmodIso },
  ];

  const staticRoutes = staticRouteDefs
    .map(
      ({ route, priority, changefreq, lastmod }) => `
  <url>
    <loc>${escapeXml(`${baseUrl}${route}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join('');
  const articleUrls = validArticles
    .map(
      (article) => `
  <url>
    <loc>${escapeXml(`${baseUrl}/news/${article.slug}`)}</loc>
    <lastmod>${article.updatedAt.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticRoutes}
  ${articleUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=600',
    },
  });
}

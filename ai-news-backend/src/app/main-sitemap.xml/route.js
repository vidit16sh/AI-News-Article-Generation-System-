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

  const staticRoutes = ['', '/about', '/contact', '/authors', '/archive', '/category/crypto', '/category/bitcoin', '/category/ethereum', '/category/finance']
    .map(
      (route) => `
  <url>
    <loc>${escapeXml(`${baseUrl}${route}`)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('');

  const articles = await prisma.generatedArticle.findMany({
    where: {
      status: 'PUBLISHED',
      confidenceScore: { gte: minConfidence },
    },
    orderBy: { publishAt: 'desc' },
    take: 49000,
    select: { slug: true, updatedAt: true },
  });

  const articleUrls = articles
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

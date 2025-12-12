// src/app/api/feed/sitemap.xml/route.js
import prisma from '@/lib/prisma';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const articles = await prisma.generatedArticle.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishAt: 'desc' },
    take: 1000,
    select: { slug: true, publishAt: true }
  });

  const urls = articles.map(article => {
    return `
  <url>
    <loc>${baseUrl}/news/${article.slug}</loc>
    <lastmod>${new Date(article.publishAt).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  ${urls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=3600'
    }
  });
}
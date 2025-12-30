import prisma from '@/lib/prisma';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://coinmarketbuzz.com';
  const articles = await prisma.generatedArticle.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishAt: 'desc' },
    take: 50000, // Standard sitemaps can hold up to 50k
    select: { slug: true, updatedAt: true }
  });

  const urls = articles.map(a => `
    <url>
      <loc>${baseUrl}/news/${a.slug}</loc>
      <lastmod>${a.updatedAt.toISOString()}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.7</priority>
    </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
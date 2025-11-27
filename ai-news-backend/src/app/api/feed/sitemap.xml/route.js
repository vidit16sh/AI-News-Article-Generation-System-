import prisma from '@/lib/prisma'; 

export const revalidate = 3600;

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    // 1. Fetch Articles
    const articles = await prisma.generatedArticle.findMany({
      take: 100,
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      select: { slug: true, createdAt: true }
    });

    // 2. Fetch Categories
    const categories = await prisma.category.findMany();

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${baseUrl}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
      ${categories.map(cat => `
      <url>
        <loc>${baseUrl}/category/${cat.name.toLowerCase()}</loc>
        <changefreq>hourly</changefreq>
        <priority>0.8</priority>
      </url>
      `).join('')}
      ${articles.map(article => `
      <url>
        <loc>${baseUrl}/article/${article.slug}</loc>
        <lastmod>${article.createdAt.toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.9</priority>
      </url>
      `).join('')}
    </urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });

  } catch (error) {
    console.error('Sitemap Error:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
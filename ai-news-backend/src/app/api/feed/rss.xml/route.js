import prisma from '@/lib/prisma'; 

export const revalidate = 3600; // Cache for 1 hour

const escapeXml = (unsafe) => {
  return unsafe ? unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  }) : '';
};

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const articles = await prisma.generatedArticle.findMany({
      take: 50,
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      select: {
        headline: true,
        slug: true,
        metaDescription: true,
        createdAt: true,
        id: true
      }
    });

    const items = articles.map((article) => `
      <item>
        <title>${escapeXml(article.headline)}</title>
        <link>${baseUrl}/article/${article.slug}</link>
        <guid isPermaLink="false">${article.id}</guid>
        <pubDate>${new Date(article.createdAt).toUTCString()}</pubDate>
        <description>${escapeXml(article.metaDescription)}</description>
      </item>
    `).join('');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
        <channel>
          <title>AI News Backend</title>
          <link>${baseUrl}</link>
          <description>Real-time AI generated news for Crypto and Tech.</description>
          <language>en-us</language>
          <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
          ${items}
        </channel>
      </rss>`;

    return new Response(rssFeed, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });

  } catch (error) {
    console.error('RSS Error:', error);
    return new Response('Error generating feed', { status: 500 });
  }
}
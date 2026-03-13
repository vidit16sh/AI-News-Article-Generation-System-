// src/app/rss.xml/route.js
import prisma from '@/lib/prisma';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Fetch last 20 published articles
  const articles = await prisma.generatedArticle.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishAt: 'desc' },
    take: 20,
    include: { author: true, originalNews: { include: { category: true } } }
  });

  const rssItems = articles.map(article => {
    const url = `${baseUrl}/news/${article.slug}`;
    const imageUrl = article.imageUrl
      ? (article.imageUrl.startsWith('http') ? article.imageUrl : `${baseUrl}${article.imageUrl}`)
      : null;
    const authorName = article.author ? article.author.name : "Editorial Team";
    const category = article.originalNews?.category?.name || "News";
    
    return `
    <item>
      <title><![CDATA[${article.headline}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(article.publishAt).toUTCString()}</pubDate>
      <description><![CDATA[${article.metaDescription}]]></description>
      <category>${category}</category>
      <dc:creator>${authorName}</dc:creator>
      ${imageUrl ? `<enclosure url="${imageUrl}" length="0" type="image/jpeg" />` : ''}
    </item>`;
  }).join('');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>CoinMarketBuzz</title>
    <link>${baseUrl}</link>
    <description>Latest cryptocurrency, blockchain, and financial market news from CoinMarketBuzz.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=600'
    }
  });
}

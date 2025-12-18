// src/app/sitemap.js
import prisma from '@/lib/prisma';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://coinmarketbuzz.com';

  const articles = await prisma.generatedArticle.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishAt: 'desc' },
    take: 1000,
    select: { slug: true, publishAt: true }
  });

  const articleUrls = articles.map(article => ({
    url: `${baseUrl}/news/${article.slug}`,
    lastModified: new Date(article.publishAt),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    ...articleUrls,
  ];
}
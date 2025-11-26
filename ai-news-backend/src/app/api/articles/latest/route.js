import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Cache settings: Revalidate every 60 seconds
export const revalidate = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const articles = await prisma.generatedArticle.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        headline: true,       // Maps to 'title'
        slug: true,
        metaDescription: true,
        createdAt: true,      // Maps to 'publishedAt'
        tags: true,           // Maps to category/tags
        // Note: We do NOT select 'articleHtml' here to save bandwidth
      },
    });

    return NextResponse.json(articles, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch latest articles' }, { status: 500 });
  }
}
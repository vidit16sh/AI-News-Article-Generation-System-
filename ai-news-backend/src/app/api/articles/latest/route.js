import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

// Force dynamic (no static caching) so we always get the newest data on refresh
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate ISR cache every 60s

export async function GET() {
  try {
    const articles = await prisma.generatedArticle.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      where: { status: 'PUBLISHED' }, // Only show published news
      select: {
        id: true,
        headline: true,
        slug: true,
        imageUrl: true, // Added this based on Phase 4
        metaDescription: true,
        createdAt: true,
        tags: true,
        // We do NOT select 'articleHtml' here to keep the payload small ( < 80ms response)
      },
    });

    return NextResponse.json(articles, { status: 200 });
  } catch (error) {
    console.error('API Error (Latest):', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const query = (searchParams.get('q') || '').trim();
  const category = (searchParams.get('category') || 'all').trim().toLowerCase();
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);

  // ✅ Default 20 (as requested), cap to 50
  const limitRaw = parseInt(searchParams.get('limit') || '20', 10) || 20;
  const limit = Math.min(Math.max(limitRaw, 1), 50);

  try {
    const where = {
      status: 'PUBLISHED',
    };

    // 1. Search Filter
    if (query) {
      where.OR = [
        { headline: { contains: query, mode: 'insensitive' } },
        { metaDescription: { contains: query, mode: 'insensitive' } },
      ];
    }

    // 2. Category Filter (server-side)
    if (category && category !== 'all') {
      // ✅ Your current DB logic stores categories in tags array
      where.tags = { has: category };
    }

    // 3. Execute Query
    const skip = (page - 1) * limit;

    const [articles, total] = await prisma.$transaction([
      prisma.generatedArticle.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          headline: true,
          slug: true,
          imageUrl: true,
          metaDescription: true,
          createdAt: true,
          tags: true,
          priorityScore: true,
          confidenceScore: true,

          // ✅ Include Author Data for the Grid Cards
          author: {
            select: {
              name: true,
              slug: true,
              imageUrl: true,
              role: true,
            },
          },

          originalNews: {
            select: {
              sourceUrl: true,
              title: true,
            },
          },
        },
      }),
      prisma.generatedArticle.count({ where }),
    ]);

    return NextResponse.json({
      data: articles,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

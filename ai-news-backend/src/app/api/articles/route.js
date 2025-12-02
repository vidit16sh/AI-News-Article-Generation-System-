import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure fresh data

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 12; // 12 items per page

  try {
    // Build the filter dynamically
    const where = {
      status: 'PUBLISHED',
    };

    // 1. Search Filter (Headline or Description)
    if (query) {
      where.OR = [
        { headline: { contains: query, mode: 'insensitive' } },
        { metaDescription: { contains: query, mode: 'insensitive' } }
      ];
    }

    // 2. Category Filter (Tag Matching)
    if (category && category !== 'all') {
      // Matches if the tags array contains the category (case insensitive logic handled by frontend passing correct slug)
      where.tags = {
        has: category 
      };
    }

    // 3. Execute Query with Pagination
    const [articles, total] = await prisma.$transaction([
      prisma.generatedArticle.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
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
          confidenceScore: true
        }
      }),
      prisma.generatedArticle.count({ where })
    ]);

    return NextResponse.json({
      data: articles,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
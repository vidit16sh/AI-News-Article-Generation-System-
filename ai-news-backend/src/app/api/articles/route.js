import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '12');

  try {
    const where = {
      status: 'PUBLISHED',
    };

    // 1. Search Filter
    if (query) {
      where.OR = [
        { headline: { contains: query, mode: 'insensitive' } },
        { metaDescription: { contains: query, mode: 'insensitive' } }
      ];
    }

    // 2. Category Filter
    if (category && category !== 'all') {
      where.tags = {
        has: category 
      };
    }

    // 3. Execute Query
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
          confidenceScore: true,
          
          // ✅ FIX: Include Author Data for the Grid Cards
          author: {
            select: {
                name: true,
                slug: true,
                imageUrl: true,
                role: true
            }
          },

          originalNews: {
            select: {
              sourceUrl: true,
              title: true
            }
          }
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
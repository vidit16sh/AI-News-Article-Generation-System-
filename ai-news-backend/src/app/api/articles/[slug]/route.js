import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET(request, { params }) {
  // ✅ FIX: Await params because Next.js 15+ treats it as a Promise
  const { slug } = await params;

  // 1. Basic Security: Sanitize slug input
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
  }

  try {
    // 2. Fetch Main Article
    const article = await prisma.generatedArticle.findUnique({
      where: { slug: slug },
      include: {
        originalNews: {
            select: { categoryId: true }
        }
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // 3. Fetch Related Articles (Same Tags)
    const relatedArticles = await prisma.generatedArticle.findMany({
      where: {
        slug: { not: slug }, // Exclude current
        status: 'PUBLISHED',
        tags: { hasSome: article.tags || [] } // Match any tag
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        headline: true,
        slug: true,
        imageUrl: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      article,
      relatedArticles
    }, { status: 200 });

  } catch (error) {
    console.error(`API Error (${slug}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
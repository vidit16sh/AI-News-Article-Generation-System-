import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET(request, { params }) {
  const { slug } = params;

  // 1. Sanitize Slug (Basic Security)
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
  }

  try {
    // 2. Fetch Main Article
    const article = await prisma.generatedArticle.findUnique({
      where: { slug: slug },
      include: {
        // We include the original news to get the specific category ID if needed
        originalNews: {
            select: { categoryId: true }
        }
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // 3. Fetch Related Articles (Same Category or Tags)
    // We try to match tags first, fallback to basic recent if no tags
    const relatedArticles = await prisma.generatedArticle.findMany({
      where: {
        slug: { not: slug }, // Exclude current
        tags: { hasSome: article.tags || [] } // Match any tag
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        headline: true,
        slug: true,
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
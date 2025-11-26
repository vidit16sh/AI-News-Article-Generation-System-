import prisma from '../../../../../lib/prisma'; // Note: deeper nesting needs more ../
import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET(request, { params }) {
  const { slug } = params;

  // 1. Basic Security: Sanitize slug input
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
  }

  try {
    // 2. Fetch the requested article
    const article = await prisma.generatedArticle.findUnique({
      where: { slug: slug },
      include: {
        originalNews: {
            select: { categoryId: true } // We need this to find related news
        }
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // 3. Fetch 5 Related Articles (Based on tags or category)
    const relatedArticles = await prisma.generatedArticle.findMany({
      where: {
        slug: { not: slug }, // Don't recommend the current article
        status: 'PUBLISHED',
        tags: { hasSome: article.tags || [] } // Find overlap in tags
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
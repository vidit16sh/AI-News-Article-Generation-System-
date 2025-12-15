import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET(request, { params }) {
  const { slug } = await params;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
  }

  try {
    const article = await prisma.generatedArticle.findUnique({
      where: { slug: slug },
      include: {
        // ✅ FIX: Explicitly include the Author relation
        author: {
            select: {
                name: true,
                slug: true,
                imageUrl: true,
                role: true,
                bio: true // Include bio if your frontend needs it
            }
        },
        originalNews: {
            select: { categoryId: true }
        }
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const relatedArticles = await prisma.generatedArticle.findMany({
      where: {
        slug: { not: slug },
        status: 'PUBLISHED',
        tags: { hasSome: article.tags || [] }
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
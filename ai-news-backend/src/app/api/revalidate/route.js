import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const secret = process.env.API_SECRET_KEY;
    const authHeader = request.headers.get('x-admin-key');

    if (!secret || authHeader !== secret) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { tag, path, paths } = body;

    if (!tag && !path && (!Array.isArray(paths) || paths.length === 0)) {
      return NextResponse.json({ message: "Provide 'tag' or 'path' or 'paths'[]" }, { status: 400 });
    }

    const pathSet = new Set();

    if (tag) {
      revalidateTag(tag, 'max');
      console.log(`Tag revalidated: ${tag}`);

      if (tag === 'articles') {
        const articlePaths = ['/', '/archive', '/sitemap.xml', '/main-sitemap.xml', '/news-sitemap.xml', '/rss.xml'];
        for (const articlePath of articlePaths) {
          pathSet.add(articlePath);
        }
      }
    }

    if (path) {
      pathSet.add(path);
    }

    if (Array.isArray(paths)) {
      for (const p of paths) {
        if (typeof p === 'string' && p.trim()) {
          pathSet.add(p.trim());
        }
      }
    }

    for (const p of pathSet) {
      revalidatePath(p);
      console.log(`Path revalidated: ${p}`);
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      target: tag || path || paths,
      pathCount: pathSet.size,
    });
  } catch (error) {
    console.error('Revalidate error:', error);
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}

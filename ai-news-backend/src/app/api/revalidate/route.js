// src/app/api/revalidate/route.js
import { revalidateTag, revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    if (authHeader !== process.env.API_SECRET_KEY) {
      return NextResponse.json({ message: 'Invalid Token' }, { status: 401 });
    }

    const { tag, path } = await request.json();

    // 1. Revalidate by Tag (Clears the data for any component using this tag)
    if (tag) {
      revalidateTag(tag);
      console.log(`✨ Tag revalidated: ${tag}`);
    }

    // 2. Revalidate by Path (Forces the homepage or article page to rebuild)
    if (path) {
      revalidatePath(path);
      console.log(`✨ Path revalidated: ${path}`);
    }

    return NextResponse.json({ 
      revalidated: true, 
      now: Date.now(),
      target: tag || path 
    });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
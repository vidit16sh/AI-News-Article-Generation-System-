import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Check API Key to prevent strangers from clearing your cache
    const authHeader = request.headers.get('x-admin-key');
    
    if (authHeader !== process.env.API_SECRET_KEY) {
        return NextResponse.json({ message: 'Invalid Token' }, { status: 401 });
    }

    const { tag } = await request.json();

    if (!tag) {
      return NextResponse.json({ message: 'Missing tag parameter' }, { status: 400 });
    }

    // Clear Next.js Cache
    revalidateTag(tag);

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
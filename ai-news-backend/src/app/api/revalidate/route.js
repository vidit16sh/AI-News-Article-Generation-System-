import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    
    // Basic Security Check
    if (authHeader !== process.env.API_SECRET_KEY) {
        return NextResponse.json({ message: 'Invalid Token' }, { status: 401 });
    }

    const { tag } = await request.json();

    if (!tag) {
      return NextResponse.json({ message: 'Missing tag' }, { status: 400 });
    }

    // Trigger Revalidation
    revalidateTag(tag);

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
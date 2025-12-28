// src/app/api/revalidate/route.js
import { revalidateTag, revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const secret = process.env.API_SECRET_KEY;
    const authHeader = request.headers.get("x-admin-key");

    if (!secret || authHeader !== secret) {
      return NextResponse.json({ message: "Invalid Token" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { tag, path, paths } = body;

    if (!tag && !path && (!Array.isArray(paths) || paths.length === 0)) {
      return NextResponse.json(
        { message: "Provide 'tag' or 'path' or 'paths'[]" },
        { status: 400 }
      );
    }

    if (tag) {
      revalidateTag(tag, 'max');
      console.log(`✨ Tag revalidated: ${tag}`);
    }

    if (path) {
      revalidatePath(path);
      console.log(`✨ Path revalidated: ${path}`);
    }

    if (Array.isArray(paths)) {
      for (const p of paths) {
        if (typeof p === "string" && p.trim()) {
          revalidatePath(p);
          console.log(`✨ Path revalidated: ${p}`);
        }
      }
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      target: tag || path || paths,
    });
  } catch (err) {
    console.error("Revalidate error:", err);
    return NextResponse.json({ message: "Error revalidating" }, { status: 500 });
  }
}

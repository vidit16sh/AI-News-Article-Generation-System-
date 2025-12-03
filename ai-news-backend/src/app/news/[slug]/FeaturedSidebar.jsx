// src/app/news/[slug]/FeaturedSidebar.jsx
import Link from "next/link";
import Image from "next/image";

export default function FeaturedSidebar({ articles }) {
  if (!Array.isArray(articles) || articles.length === 0) {
    return null;
  }

  const normalized = articles.slice(0, 5).map(normalizeArticle);

  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="h-[16px] w-[6px] rounded-[2px] bg-red-500" />
        <h2 className="text-sm font-light text-slate-900">Featured</h2>
      </div>

      <div className="space-y-3">
        {normalized.map((a) => (
          <Link
            key={a.slug}
            href={`/news/${a.slug}`}
            className="group flex gap-3 rounded-md bg-white px-2 py-2 hover:bg-slate-50 transition"
          >
            {/* Thumbnail */}
            <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
              {a.imageUrl ? (
                <Image
                  src={a.imageUrl}
                  alt={a.title}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <span className="text-xl">📰</span>
                </div>
              )}
            </div>

            {/* Text */}
            <div className="flex flex-1 flex-col justify-center gap-1">
              <div className="text-[0.7rem] text-slate-500">
                {a.category && (
                  <>
                    {a.category}
                    {a.date && " • "}
                  </>
                )}
                {a.date}
              </div>
              <h3 className="line-clamp-2 text-[0.85rem] font-light text-slate-900 group-hover:underline underline-offset-[3px]">
                {a.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function normalizeArticle(article) {
  const slug = article.slug || article.id || "#";
  const title = article.headline || article.title || "Untitled article";
  const category =
    article.category ||
    article.primaryCategory ||
    article.tags?.[0] ||
    "";
  const imageUrl =
    article.imageUrl || article.heroImageUrl || article.thumbnail || "";

  const date = article.createdAt
    ? new Date(article.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "";

  return {
    slug,
    title,
    category,
    imageUrl,
    date,
  };
}

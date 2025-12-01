import Link from "next/link";

export default function TopStoriesSection({ mainArticle, listArticles }) {
  const main = mainArticle ? normalizeArticle(mainArticle) : null;
  const list = Array.isArray(listArticles) ? listArticles.map(normalizeArticle) : [];

  if (!main) return null;

  return (
    <section className="rounded-md bg-[#f7fafc] px-3 py-4 sm:px-8 sm:py-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Same red rectangle style */}
          <span className="h-[16px] w-[6px] bg-red-500 rounded-[2px]" />
          <h2 className="text-sm font-light text-slate-800">
            Top stories
          </h2>
        </div>
        <Link
          href="/category/world-news"
          className="text-[0.75rem] font-normal text-slate-500 hover:text-red-600"
        >
          View all
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1.2fr]">
        {/* Main big image with overlay text */}
        <Link
          href={`/news/${main.slug}`}
          className="group block"
        >
          <div className="relative w-full aspect-square overflow-hidden rounded-md bg-slate-100">
            {main.imageUrl ? (
              <img
                src={main.imageUrl}
                alt={main.title}
                className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <span className="text-4xl">📰</span>
              </div>
            )}

            {/* Bottom fade overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Text at bottom over image */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
              <div className="text-[0.75rem] font-light text-slate-200">
                {main.category} • {main.date}
              </div>
              <h3 className="mt-1 text-[1.05rem] sm:text-[1.1rem] font-light leading-snug text-white group-hover:underline underline-offset-[3px]">
                {main.title}
              </h3>
            </div>
          </div>
        </Link>

        {/* List of other stories */}
        <div className="bg-white">
          <div className="divide-y divide-slate-100">
            {list.map((a) => (
              <Link
                key={a.slug}
                href={`/news/${a.slug}`}
                className="group block px-4 py-3"
              >
                <div className="text-[0.75rem] font-light text-slate-500">
                  {a.category} • {a.date}
                </div>
                <div className="mt-1 text-[1rem] sm:text-[1.05rem] font-light text-slate-900 line-clamp-2 group-hover:underline underline-offset-[3px]">
                  {a.title}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function normalizeArticle(article) {
  const slug = article.slug || article.id || "#";
  const title = article.headline || article.title || "Untitled article";
  const excerpt =
    article.metaDescription ||
    article.summary ||
    article.excerpt ||
    "";
  const category =
    article.category ||
    article.primaryCategory ||
    article.tags?.[0] ||
    "News";
  const imageUrl =
    article.imageUrl || article.heroImageUrl || article.thumbnail || "";

  return {
    slug,
    title,
    excerpt,
    category,
    imageUrl,
    date: formatDisplayDate(article.createdAt),
  };
}

function formatDisplayDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

import Link from "next/link";

export default function SidebarFinanceSection({ articles }) {
  const list = Array.isArray(articles) ? articles.map(normalizeArticle) : [];
  if (!list.length) return null;

  const [featured, ...rest] = list;

  return (
    <section>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header inside card */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Finance
            </h2>
          </div>
          <Link
            href="/category/finance"
            className="text-[0.75rem] font-medium text-red-600 hover:text-red-700"
          >
            view all ▾
          </Link>
        </div>

        {/* Featured image & title */}
        <Link href={`/news/${featured.slug}`} className="block">
          <div className="h-40 w-full bg-slate-100">
            {featured.imageUrl ? (
              <img
                src={featured.imageUrl}
                alt={featured.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <span className="text-4xl">💹</span>
              </div>
            )}
          </div>
          <div className="space-y-1 px-4 py-3">
            <div className="text-[0.7rem] text-slate-500">
              {featured.category} • {featured.date}
            </div>
            <div className="text-[0.9rem] font-semibold text-slate-900 line-clamp-2">
              {featured.title}
            </div>
          </div>
        </Link>

        {/* List of other finance headlines */}
        <div className="border-t border-slate-100">
          {rest.map((a) => (
            <Link
              key={a.slug}
              href={`/news/${a.slug}`}
              className="block px-4 py-3 hover:bg-slate-50"
            >
              <div className="text-[0.7rem] text-slate-500">
                {a.category} • {a.date}
              </div>
              <div className="mt-1 text-[0.85rem] font-medium text-slate-900 line-clamp-2">
                {a.title}
              </div>
            </Link>
          ))}
        </div>
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
    "Finance";
  const imageUrl =
    article.imageUrl || article.heroImageUrl || article.thumbnail || "";

  return {
    slug,
    title,
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

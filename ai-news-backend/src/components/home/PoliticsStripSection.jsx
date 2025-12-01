import Link from "next/link";

export default function PoliticsStripSection({ articles }) {
  const list = Array.isArray(articles) ? articles.map(normalizeArticle) : [];
  const sliced = list.slice(0, 4);

  if (!sliced.length) return null;

  return (
    <section className="-mx-4 bg-[#f7fafc] py-6 shadow-[0_-6px_12px_rgba(15,23,42,0.04),0_6px_12px_rgba(15,23,42,0.04)] sm:-mx-6">
      {/* Inner container matches main width */}
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-[16px] w-[6px] bg-red-500 rounded-[2px]" />
            <h2 className="text-[1rem] sm:text-[1.1rem] font-light text-slate-800">
              Politics
            </h2>
          </div>

          <Link
            href="/category/politics"
            className="flex items-center gap-1 text-[0.9rem] font-light text-red-600 hover:text-red-700"
          >
            View all <span className="text-red-600 text-sm">→</span>
          </Link>
        </div>

        {/* Cards – four in one row on desktop */}
        <div className="grid gap-5 md:grid-cols-4">
          {sliced.map((a) => (
            <Link
              key={a.slug}
              href={`/news/${a.slug}`}
              className="group flex gap-3 rounded-xl px-2 py-2 hover:bg-white/60 transition"
            >
              {/* Image */}
              <div className="h-28 w-32 sm:h-32 sm:w-36 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {a.imageUrl ? (
                  <img
                    src={a.imageUrl}
                    alt={a.title}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <span className="text-2xl">🏛️</span>
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="flex flex-col justify-center gap-1">
                <div className="text-[0.75rem] font-light text-slate-500">
                  {a.date && `${a.date} • `}
                  <span>{a.category}</span>
                </div>
                <h3 className="text-[0.9rem] sm:text-[0.95rem] font-light text-slate-900 leading-snug group-hover:underline underline-offset-[3px]">
                  {a.title}
                </h3>
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
    "Politics";
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

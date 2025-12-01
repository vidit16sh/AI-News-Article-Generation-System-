import Link from "next/link";

export default function LatestNewsSection({ articles }) {
  const hasArticles = Array.isArray(articles) && articles.length > 0;

  return (
    <section>
      {/* Header row */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Red rectangle */}
          <span className="h-[16px] w-[6px] bg-red-500 rounded-[2px]" />
          <h2 className="text-sm font-light text-slate-800">
            Latest news
          </h2>
        </div>

        {/* Line between title and view all */}
        <div className="hidden h-px flex-1 bg-slate-200 sm:block" />

        <Link
          href="/category/crypto"
          className="ml-auto text-[0.75rem] font-normal text-slate-500 hover:text-red-600"
        >
          View all
        </Link>
      </div>

      {!hasArticles ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No articles available yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {articles.map((article) => (
            <LatestCard key={article.slug || article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}

function LatestCard({ article }) {
  const a = normalizeArticle(article);

  return (
    <Link
      href={`/news/${a.slug}`}
      className="group flex h-full flex-col gap-2"
    >
      {/* Image only, fixed height */}
      <div className="w-full h-48 sm:h-48 md:h-48 overflow-hidden rounded-md bg-slate-100">
        {a.imageUrl ? (
          <img
            src={a.imageUrl}
            alt={a.title}
            className="h-full w-full object-cover object-center transition-opacity duration-200 group-hover:opacity-80 rounded-md"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 rounded-md">
            <span className="text-3xl">📰</span>
          </div>
        )}
      </div>

      {/* Text below image */}
      <div className="flex flex-1 flex-col gap-1">
        <div className="text-[0.75rem] font-light text-slate-500">
          {a.date && `${a.date} • `}
          <span>{a.category}</span>
        </div>

        <h3 className="line-clamp-2 text-[1rem] sm:text-[1.05rem] font-light text-slate-900 group-hover:underline underline-offset-[3px]">
          {a.title}
        </h3>
      </div>
    </Link>
  );
}

function normalizeArticle(article) {
  const slug = article.slug || article.id || "#";
  const title = article.headline || article.title || "Untitled article";
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

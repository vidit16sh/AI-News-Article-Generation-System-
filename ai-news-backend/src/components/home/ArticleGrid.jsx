import Link from "next/link";

export default function ArticleGrid({ articles }) {
  const hasArticles = Array.isArray(articles) && articles.length > 0;

  return (
    <section className="mb-10 mt-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
            Latest AI-generated news
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Fresh crypto, AI, and macro headlines, expanded into readable
            explainers.
          </p>
        </div>
        <Link
          href="/category/crypto"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          View all crypto news →
        </Link>
      </div>

      {!hasArticles ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No articles available yet. Background workers might still be ingesting
          and generating the first batch of stories. Check back in a little
          while.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.slug || article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}

function ArticleCard({ article }) {
  const slug = article.slug || article.id || "#";
  const title = article.headline || article.title || "Untitled article";
  const excerpt =
    article.metaDescription ||
    article.summary ||
    article.excerpt ||
    "AI-generated article without a summary.";
  const category =
    article.category ||
    article.primaryCategory ||
    article.tags?.[0] ||
    "News";
  const author = article.authorName || article.sourceName || "AI Writer";
  const timeAgo = timeAgoFromDate(article.createdAt);
  const thumbnail =
    article.imageUrl || article.heroImageUrl || article.thumbnail || "";

  return (
    <Link
      href={slug === "#" ? "#" : `/news/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-md"
    >
      <div className="relative h-40 w-full overflow-hidden bg-slate-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <span className="text-3xl">{iconForCategory(category)}</span>
          </div>
        )}

        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 text-[0.7rem] font-medium text-slate-50 backdrop-blur">
          <span className="opacity-80">{iconForCategory(category)}</span>
          <span>{category}</span>
        </div>
        <div className="absolute right-2 bottom-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.12em] text-emerald-300">
          AI-generated
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-slate-950 sm:text-[0.95rem]">
          {title}
        </h3>
        <p className="line-clamp-3 text-xs text-slate-500 sm:text-[0.8rem]">
          {excerpt}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2 text-[0.7rem] text-slate-400">
          <span>By {author}</span>
          <span>{timeAgo}</span>
        </div>
      </div>
    </Link>
  );
}

function iconForCategory(category) {
  const key = (category || "").toLowerCase();
  if (key.includes("bitcoin")) return "₿";
  if (key.includes("crypto")) return "🪙";
  if (key.includes("eth") || key.includes("ethereum")) return "Ξ";
  if (key.includes("ai")) return "🤖";
  if (key.includes("world")) return "🌍";
  if (key.includes("tech")) return "💻";
  return "✨";
}

function timeAgoFromDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

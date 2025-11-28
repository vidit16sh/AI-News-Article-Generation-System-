import Link from "next/link";

/* ---------- Data fetching ---------- */

async function fetchLatestArticles() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/articles/latest`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error("Failed to fetch latest articles:", res.status);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error fetching latest articles:", err);
    return [];
  }
}

/* ---------- Metadata ---------- */

export async function generateMetadata({ params }) {
  const slug = params?.slug ?? "news";
  const meta = getCategoryMeta(slug);

  return {
    title: `${meta.label} News | VrajNews`,
    description:
      meta.description ||
      `AI-generated ${meta.label.toLowerCase()} news, summaries, and explainers.`,
  };
}

/* ---------- Page ---------- */

export default async function CategoryPage({ params, searchParams }) {
  const slug = params?.slug ?? "news"; // e.g. "crypto", "ai-news"
  const pageParam = parseInt(searchParams?.page || "1", 10);
  const currentPage =
    Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const allArticles = await fetchLatestArticles();
  const meta = getCategoryMeta(slug);

  // ✅ Filter articles by tags (this is what /api/articles/latest returns)
  const filteredArticles = filterByCategorySlug(allArticles, slug);

  const PAGE_SIZE = 12;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredArticles.length / PAGE_SIZE),
  );
  const clampedPage = Math.min(currentPage, totalPages);

  const start = (clampedPage - 1) * PAGE_SIZE;
  const pageArticles = filteredArticles.slice(start, start + PAGE_SIZE);
  const hasArticles = pageArticles.length > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top heading for that category */}
      <section className="mt-1 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[0.7rem] font-medium text-slate-500">
              <span className="text-base">{meta.icon}</span>
              <span className="uppercase tracking-[0.18em]">Category</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              {meta.label} News
            </h1>
            <p className="max-w-2xl text-sm text-slate-500">
              {meta.description}
            </p>
          </div>

          <Link
            href="/"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            ← Back to homepage
          </Link>
        </div>
      </section>

      {/* Articles list for that category */}
      <section className="space-y-4">
        {hasArticles ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pageArticles.map((article) => (
                <ArticleCard
                  key={article.slug || article.id}
                  article={article}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:px-4">
                <div>
                  Page{" "}
                  <span className="font-semibold text-slate-800">
                    {clampedPage}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-800">
                    {totalPages}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {clampedPage > 1 && (
                    <PageLink
                      slug={slug}
                      page={clampedPage - 1}
                      direction="prev"
                    />
                  )}
                  {clampedPage < totalPages && (
                    <PageLink
                      slug={slug}
                      page={clampedPage + 1}
                      direction="next"
                    />
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No articles in{" "}
            <span className="font-semibold">{meta.label}</span> yet. Background
            workers may not have generated stories for this category, or content
            is still being ingested.
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Category helpers ---------- */

function getCategoryMeta(slug) {
  const key = (slug || "news").toLowerCase();

  switch (key) {
    case "crypto":
      return {
        label: "Crypto",
        icon: "🪙",
        description:
          "Market-moving headlines, liquidity rotations, and on-chain narratives across the crypto ecosystem.",
      };
    case "bitcoin":
      return {
        label: "Bitcoin",
        icon: "₿",
        description:
          "Macro trends, ETF flows, miner economics, and narratives centered around Bitcoin as an asset and protocol.",
      };
    case "ai-news":
      return {
        label: "AI News",
        icon: "🤖",
        description:
          "How AI is reshaping markets, trading, infrastructure, and the broader tech landscape.",
      };
    case "world-news":
      return {
        label: "World News",
        icon: "🌍",
        description:
          "Macro events, regulation, and global news that influence risk sentiment and capital flows.",
      };
    case "technology":
      return {
        label: "Technology",
        icon: "💻",
        description:
          "Infrastructure, software, and hardware trends that underpin crypto, AI, and modern finance.",
      };
    default:
      return {
        label: "News",
        icon: "✨",
        description:
          "AI-generated coverage across crypto, AI, macro, and technology, curated from multiple sources.",
      };
  }
}

/**
 * Filter articles by category slug using tags.
 * Example:
 *  - slug "crypto"  → matches tags ["Crypto", "Crypto News"]
 *  - slug "ai-news" → matches tags ["AI News", "AI"]
 */
function filterByCategorySlug(articles, slug) {
  if (!Array.isArray(articles) || !slug) return [];

  const slugLower = slug.toLowerCase();

  return articles.filter((article) => {
    const tags = Array.isArray(article.tags) ? article.tags : [];
    if (tags.length === 0) return false;

    return tags.some((tag) => {
      const t = tag.toLowerCase();
      const tSlug = t.replace(/\s+/g, "-"); // "AI News" → "ai-news"
      return (
        t === slugLower ||
        tSlug === slugLower ||
        t.includes(slugLower) ||
        tSlug.includes(slugLower)
      );
    });
  });
}

/* ---------- UI helpers ---------- */

function ArticleCard({ article }) {
  const slug = article.slug || article.id || "#";
  const title = article.headline || "Untitled article";
  const excerpt =
    article.metaDescription ||
    "AI-generated article without a summary yet.";
  const firstTag = Array.isArray(article.tags) && article.tags.length > 0
    ? article.tags[0]
    : "News";
  const author = "AI Writer"; // no author field in API, so we label it
  const timeAgo = timeAgoFromDate(article.createdAt);
  const thumbnail = article.imageUrl || "";

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
            <span className="text-3xl">{iconForCategory(firstTag)}</span>
          </div>
        )}

        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 text-[0.7rem] font-medium text-slate-50 backdrop-blur">
          <span className="opacity-80">{iconForCategory(firstTag)}</span>
          <span>{firstTag}</span>
        </div>
        <div className="absolute right-2 bottom-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.12em] text-emerald-300">
          AI-generated
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h2 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-slate-950 sm:text-[0.95rem]">
          {title}
        </h2>
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

function PageLink({ slug, page, direction }) {
  const href =
    page === 1
      ? `/category/${slug}`
      : `/category/${slug}?page=${encodeURIComponent(page)}`;

  const label =
    direction === "prev"
      ? "Previous"
      : direction === "next"
      ? "Next"
      : `Page ${page}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
    >
      {direction === "prev" && <span>←</span>}
      <span>{label}</span>
      {direction === "next" && <span>→</span>}
    </Link>
  );
}

function iconForCategory(tagOrCategory) {
  const key = (tagOrCategory || "").toLowerCase();
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
import Link from "next/link";

export default function HeroSection({ featured }) {
  // Fallback if there is no featured article yet
  const fallback = {
    slug: "getting-started-with-vrajnews",
    category: "AI News",
    title: "AI-generated crypto & tech news, distilled into clean explainers.",
    excerpt:
      "VrajNews ingests external news sources, cleans them with NLP, and expands them into AI-written stories so you can scan markets quickly.",
    author: "AI Writer",
    timeAgo: "Just now",
    aiLabel: "AI-generated",
  };

  const article = featured
    ? {
        slug: featured.slug,
        category:
          featured.category ||
          featured.primaryCategory ||
          featured.tags?.[0] ||
          "News",
        title: featured.headline || featured.title || fallback.title,
        excerpt:
          featured.metaDescription ||
          featured.summary ||
          featured.excerpt ||
          fallback.excerpt,
        author: featured.authorName || featured.sourceName || fallback.author,
        timeAgo: timeAgoFromDate(featured.createdAt) || fallback.timeAgo,
        aiLabel: "AI-generated",
      }
    : fallback;

  return (
    <section className="mb-8 mt-2 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-50 shadow-sm">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: text content */}
        <div className="flex flex-col justify-between gap-4 p-5 sm:p-7">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300 ring-1 ring-emerald-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Top story
              </span>
              <span className="rounded-full bg-slate-800/80 px-2 py-1 text-[0.7rem] uppercase tracking-[0.16em] text-slate-300">
                {article.category}
              </span>
              <span className="rounded-full bg-slate-800/80 px-2 py-1 text-[0.7rem] uppercase tracking-[0.16em] text-slate-300">
                {article.aiLabel}
              </span>
            </div>

            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
              {article.title}
            </h1>

            <p className="max-w-xl text-sm text-slate-200 sm:text-base">
              {article.excerpt}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 sm:text-sm">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[0.7rem]">
                ✨
              </span>
              <span>
                Written by <span className="font-medium">{article.author}</span>
              </span>
            </div>
            <span className="h-1 w-1 rounded-full bg-slate-500" />
            <span>{article.timeAgo}</span>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/news/${article.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:-translate-y-[1px] hover:bg-white hover:shadow-md"
            >
              Read full article
              <span className="text-base">↗</span>
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/80 bg-slate-900/40 px-3 py-1.5 text-[0.75rem] text-slate-200">
              <span className="text-lg leading-none">⚠️</span>
              <span>
                AI-generated. Always double-check with primary market data.
              </span>
            </div>
          </div>
        </div>

        {/* Right: visual */}
        <div className="relative flex items-stretch">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="h-full w-full bg-[radial-gradient(circle_at_0_0,#22c55e_0,transparent_55%),radial-gradient(circle_at_100%_0,#0ea5e9_0,transparent_55%)]" />
          </div>
          <div className="relative z-10 flex w-full items-center justify-center p-5 sm:p-7">
            <div className="w-full max-w-md rounded-2xl border border-slate-600/40 bg-slate-900/70 p-4 shadow-xl">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live sentiment
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.7rem] text-emerald-300">
                  Bullish • 68%
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    BTC • USD
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-50">
                    $70,420
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-emerald-300">
                    <span className="text-[0.9rem]">▲</span>
                    <span>+3.21% (24h)</span>
                  </div>
                </div>
                <div className="h-16 w-32 rounded-lg bg-gradient-to-tr from-emerald-400/30 via-sky-400/20 to-transparent">
                  <div className="h-full w-full bg-[linear-gradient(to_right,transparent_0,transparent_10%,rgba(15,23,42,0.9)_10%,rgba(15,23,42,0.9)_11%,transparent_11%,transparent_30%,rgba(15,23,42,0.9)_30%,rgba(15,23,42,0.9)_32%,transparent_32%,transparent_60%,rgba(15,23,42,0.9)_60%,rgba(15,23,42,0.9)_63%,transparent_63%,transparent_100%)]" />
                </div>
              </div>

              <p className="mt-4 text-[0.75rem] leading-relaxed text-slate-300">
                Generated summary is based on multiple external news feeds and
                on-chain metrics. Not financial advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
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

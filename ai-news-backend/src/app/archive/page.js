// src/app/archive/page.js
import Link from "next/link";
import prisma from "@/lib/prisma";
import RightSidebar from "../../components/layout/RightSidebar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "News Archive | CoinMarketBuzz",
  description:
    "Browse the complete CoinMarketBuzz archive. Find every published article grouped by year and month.",
};

function monthLabel(monthIndex) {
  return new Date(2000, monthIndex, 1).toLocaleString("en-US", { month: "long" });
}

export default async function ArchivePage() {
  const articles = await prisma.generatedArticle.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishAt: "desc" },
    select: {
      id: true,
      slug: true,
      headline: true,
      publishAt: true,
      author: { select: { name: true } },
      originalNews: { select: { category: { select: { name: true } } } },
    },
  });

  // Group by Year -> MonthIndex -> articles[]
  const grouped = new Map(); // Map<number, Map<number, Article[]>>

  for (const a of articles) {
    if (!a.publishAt) continue;

    const d = new Date(a.publishAt);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-11

    if (!grouped.has(year)) grouped.set(year, new Map());
    const byMonth = grouped.get(year);

    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(a);
  }

  const years = Array.from(grouped.keys()).sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-0">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <main>
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 text-xs font-medium text-slate-500"
          >
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="transition-colors hover:text-slate-800">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="text-slate-700" aria-current="page">
                Archive
              </li>
            </ol>
          </nav>

          {/* Header */}
          <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              News Archive
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              A complete directory of all published CoinMarketBuzz articles,
              grouped by year and month.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Total published articles:{" "}
              <span className="font-semibold">{articles.length}</span>
            </p>
          </header>

          {articles.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">🗂️</div>
              <p className="mt-4 text-lg font-semibold text-slate-900">
                No published articles found
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Once you publish content, it will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {years.map((year) => {
                const byMonth = grouped.get(year);
                const months = Array.from(byMonth.keys()).sort((a, b) => b - a);

                return (
                  <section
                    key={year}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="text-xl font-bold text-slate-900">{year}</h2>
                      <p className="text-xs text-slate-500">
                        {months.reduce((acc, m) => acc + byMonth.get(m).length, 0)}{" "}
                        articles
                      </p>
                    </div>

                    {/* Months (open list) */}
                    <div className="mt-6 space-y-8">
                      {months.map((monthIndex) => {
                        const monthArticles = byMonth.get(monthIndex);

                        return (
                          <div key={`${year}-${monthIndex}`}>
                            {/* ✅ Month Header */}
                            <div className="mb-3 flex items-baseline justify-between border-b border-slate-200 pb-2">
                              <h3 className="text-base font-semibold text-slate-900">
                                {monthLabel(monthIndex)}
                              </h3>
                              <p className="text-xs text-slate-500">
                                {monthArticles.length} article
                                {monthArticles.length === 1 ? "" : "s"}
                              </p>
                            </div>

                            {/* ✅ Articles visible directly */}
                            <ul className="space-y-3">
                              {monthArticles.map((a) => {
                                if (!a.slug) return null;

                                const category = a.originalNews?.category?.name || "News";
                                const author = a.author?.name || "CoinMarketBuzz Staff";
                                const date = a.publishAt
                                  ? new Date(a.publishAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "";

                                return (
                                  <li
                                    key={a.id}
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                                  >
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#d00000]">
                                      {category}
                                    </div>

                                    <Link
                                      href={`/news/${a.slug}`}
                                      className="mt-1 block text-sm font-semibold leading-snug text-slate-900 hover:text-[#d00000]"
                                    >
                                      {a.headline}
                                    </Link>

                                    <div className="mt-1 text-xs text-slate-500">
                                      By{" "}
                                      <span className="text-slate-700">{author}</span>
                                      {date ? <> • <time>{date}</time></> : null}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>

        <div className="hidden h-full w-px bg-slate-200 lg:block" />

        <aside className="lg:sticky lg:top-24">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}

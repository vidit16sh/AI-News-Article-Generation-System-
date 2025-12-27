// src/app/search/page.js
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import RightSidebar from "../../components/layout/RightSidebar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  const query = sp.q || "Search";

  return {
    title: `Search Results for: "${query}" - CoinMarketBuzz`,
    description: `Discover the latest news and analysis for ${query} on CoinMarketBuzz.`,
  };
}

export default async function SearchPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const query = (sp.q || "").trim();

  const results =
    query.length === 0
      ? []
      : await prisma.generatedArticle.findMany({
          where: {
            status: "PUBLISHED",
            OR: [
              { headline: { contains: query, mode: "insensitive" } },
              // ✅ FIX: excerpt field does NOT exist in your Prisma model
              { articleHtml: { contains: query, mode: "insensitive" } },
            ],
          },
          orderBy: { publishAt: "desc" },
          take: 20,
          include: {
            author: true,
            originalNews: { include: { category: true } },
          },
        });

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
                Search
              </li>
            </ol>
          </nav>

          {/* Editorial Header */}
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Search
              {query ? (
                <>
                  {" "}
                  Results for{" "}
                  <span className="text-[#d00000]">&quot;{query}&quot;</span>
                </>
              ) : null}
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {query
                ? `Found ${results.length} article${
                    results.length === 1 ? "" : "s"
                  } matching your search.`
                : "Type a keyword to search articles across CoinMarketBuzz."}
            </p>

            {/* Search Again */}
            <form action="/search" method="GET" className="mt-5">
              <label className="sr-only" htmlFor="search-page-input">
                Search
              </label>

              <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-slate-300">
                <span className="inline-flex h-11 w-11 items-center justify-center text-slate-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M16.5 16.5 21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>

                <input
                  id="search-page-input"
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Search news, coins, markets..."
                  className="h-11 w-full bg-transparent pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                />

                <button
                  type="submit"
                  className="mr-2 inline-flex h-9 items-center justify-center rounded-lg bg-[#d00000] px-4 text-xs font-semibold text-white"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Results */}
          {query.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-700 shadow-sm">
              <div className="text-5xl">🔎</div>
              <p className="mt-3 text-base">
                Try searching for topics like <strong>Bitcoin</strong>,{" "}
                <strong>Ethereum</strong>, <strong>DeFi</strong>, or{" "}
                <strong>Regulation</strong>.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="text-6xl">🔍</div>
              <p className="mt-4 text-xl font-semibold text-slate-900">
                No articles found
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Try different keywords or browse the latest news.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block text-sm font-semibold text-[#d00000] hover:underline"
              >
                Return Home
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {results.map((article) => (
                <article
                  key={article.id}
                  className="group flex flex-col gap-4 border-b border-slate-200 pb-8 sm:flex-row"
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-64">
                    <Link href={`/news/${article.slug}`}>
                      <Image
                        src={article.imageUrl || "/default-news.jpg"}
                        alt={article.headline}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 256px"
                      />
                    </Link>
                  </div>

                  {/* Content */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d00000]">
                      {article.originalNews?.category?.name || "News"}
                    </div>

                    <Link href={`/news/${article.slug}`}>
                      <h2 className="mb-2 text-xl font-bold leading-snug text-slate-900 transition-colors hover:text-[#d00000]">
                        {article.headline}
                      </h2>
                    </Link>

                    {/* ✅ No excerpt field in your model → fallback */}
                    <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {article.headline}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="font-medium text-slate-900">
                        By {article.author?.name || "CoinMarketBuzz Staff"}
                      </span>
                      <span className="text-slate-300">•</span>
                      <time dateTime={article.publishAt?.toISOString()}>
                        {new Date(article.publishAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                  </div>
                </article>
              ))}
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

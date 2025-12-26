// src/app/search/page.js
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import RightSidebar from "../../components/layout/RightSidebar";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const query = searchParams.q || "Search";
  return {
    title: `Search Results for: "${query}" - CoinMarketBuzz`,
    description: `Discover the latest news and analysis for ${query} on CoinMarketBuzz.`
  };
} 

export default async function SearchPage({ searchParams }) {
  // 1. Get the query from the URL (e.g., /search?q=bitcoin)
  const query = searchParams.q || "";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com";

  // 2. Fetch matching articles from Prisma
  const results = await prisma.generatedArticle.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { headline: { contains: query, mode: 'insensitive' } },
        { excerpt: { contains: query, mode: 'insensitive' } },
        { articleHtml: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { publishAt: "desc" },
    take: 15,
    include: {
      author: true,
      originalNews: {
        include: { category: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-0">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,1fr)] lg:items-start lg:gap-8">
        
        <main>
          {/* ✅ Editorial Header */}
          <div className="mb-10 border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-bold text-slate-900">
              Search Results for: <span className="text-blue-600">"{query}"</span>
            </h1>
            <p className="mt-2 text-slate-500">
              Found {results.length} articles matching your criteria.
            </p>
          </div>

          {results.length === 0 ? (
            <div className="py-20 text-center">
              <span className="text-6xl">🔍</span>
              <p className="mt-4 text-xl text-slate-600">No articles found. Try different keywords.</p>
              <Link href="/" className="mt-6 inline-block text-blue-600 hover:underline">Return Home</Link>
            </div>
          ) : (
            <div className="space-y-8">
              {results.map((article) => (
                <article key={article.id} className="group flex flex-col gap-4 sm:flex-row">
                  {/* Thumbnail */}
                  <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-64">
                    <Link href={`/news/${article.slug}`}>
                      <Image
                        src={article.imageUrl || "/default-news.jpg"}
                        alt={article.headline}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 256px"
                      />
                    </Link>
                  </div>

                  {/* ✅ Audit Fix: Content Richness & Author Attribution */}
                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-600">
                      {article.originalNews?.category?.name || "News"}
                    </div>
                    
                    <Link href={`/news/${article.slug}`}>
                      <h2 className="mb-2 text-xl font-bold text-slate-900 hover:text-blue-600">
                        {article.headline}
                      </h2>
                    </Link>

                    {/* ✅ Excerpt (30-60 words) */}
                    <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {article.excerpt || article.headline}
                    </p>

                    {/* ✅ Author Byline */}
                    <div className="mt-auto flex items-center gap-2 text-sm text-slate-500">
                      <span className="font-medium text-slate-900">
                        By {article.author?.name || "CoinMarketBuzz Staff"}
                      </span>
                      <span>•</span>
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
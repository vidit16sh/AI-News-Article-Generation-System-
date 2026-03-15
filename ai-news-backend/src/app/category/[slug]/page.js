// app/category/[slug]/page.js
import Link from "next/link";
import RightSidebar from "../../../components/layout/RightSidebar";

/* ---------- Server-side category fetch ---------- */

async function fetchCategoryArticles(slug) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const safePage = Number.isFinite(Number(slug?.page)) ? Number(slug.page) : 1;

  try {
    const res = await fetch(
      `${baseUrl}/api/articles?category=${encodeURIComponent(slug.category)}&limit=20&page=${Math.max(1, safePage)}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      console.error("Failed to fetch category articles:", res.status);
      return { data: [], meta: { page: 1, totalPages: 1, total: 0 } };
    }

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data : [],
      meta: json.meta || { page: 1, totalPages: 1, total: 0 },
    };
  } catch (err) {
    console.error("Error fetching category articles:", err);
    return { data: [], meta: { page: 1, totalPages: 1, total: 0 } };
  }
}

/* ---------- Metadata ---------- */

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const safeSlug = slug ?? "news";
  const meta = getCategoryMeta(safeSlug);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com";
  const canonical = `${baseUrl}/category/${safeSlug.toString().toLowerCase()}`;

  return {
    title: `${meta.label} News | CoinMarketBuzz`,
    description:
      meta.description ||
      `Breaking ${meta.label.toLowerCase()} news, price updates, and market analysis from the CoinMarketBuzz editorial team.`,
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

/* ---------- Page ---------- */

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const safeSlug = (slug ?? "news").toString().trim().toLowerCase();
  const page = Math.max(parseInt((await searchParams)?.page || "1", 10) || 1, 1);

  const categoryMeta = getCategoryMeta(safeSlug);

  const { data: filteredArticles, meta } = await fetchCategoryArticles({
    category: safeSlug,
    page,
  });

  if (!filteredArticles.length) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <CategoryBanner label={categoryMeta.label} />
        <section>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No articles available yet.
          </div>
        </section>
      </div>
    );
  }

  const [heroArticle, ...rest] = filteredArticles;
  const gridArticles = rest;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com";
  const itemListElements = filteredArticles.map((article, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${baseUrl}/news/${article.slug || article.id}`,
    name: article.headline || article.title || "News Article",
  }));
  const categoryJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${categoryMeta.label} News`,
    url: `${baseUrl}/category/${safeSlug}${page > 1 ? `?page=${page}` : ""}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: itemListElements,
    },
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryJsonLd) }} />
      {/* Banner */}
      <CategoryBanner label={categoryMeta.label} />

      {/* Layout */}
      <div className="lg:flex lg:gap-0">
        {/* LEFT */}
        <div className="flex-1 space-y-6 lg:pr-8">
          <CategoryHero article={heroArticle} />
          <CategoryGrid articles={gridArticles} />
          {meta.totalPages > 1 && (
            <CategoryPagination slug={safeSlug} page={page} totalPages={meta.totalPages} />
          )}
        </div>

        {/* DIVIDER */}
        <div className="hidden w-px bg-slate-200 mx-6 lg:block" />

        {/* RIGHT SIDEBAR */}
        <aside className="mt-6 w-[280px] space-y-6 lg:mt-0 lg:w-[320px] lg:pl-0">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}

/* ---------- UI Components (UNCHANGED) ---------- */

function CategoryBanner({ label }) {
  return (
    <section className="mt-1 mb-3">
      <div className="flex items-center gap-3">
        <span className="h-4 w-[2px] bg-red-500" />
        <p className="text-sm font-light text-slate-900">
          Latest in {label}
        </p>
      </div>
    </section>
  );
}

function CategoryHero({ article }) {
  if (!article) return null;
  const a = normalizeArticle(article);

  return (
    <section className="mt-2">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-red-600">
              {a.category}
            </span>
            {a.date && <span className="text-slate-500">{a.date}</span>}
          </div>

          <h1 className="text-2xl font-light leading-snug sm:text-3xl">
            <Link
              href={`/news/${a.slug}`}
              className="hover:underline underline-offset-[3px] decoration-red-500"
            >
              {a.title}
            </Link>
          </h1>

          {a.excerpt && (
            <p className="max-w-xl text-[0.9rem] text-slate-600">
              {a.excerpt}
            </p>
          )}
        </div>

        <div className="relative h-52 overflow-hidden rounded-md bg-slate-100">
          {a.imageUrl ? (
            <img
              src={a.imageUrl}
              alt={a.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300">
              📰
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryGrid({ articles }) {
  if (!articles.length) return null;

  return (
    <section className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => {
          const a = normalizeArticle(article);
          return (
            <Link
              key={a.slug}
              href={`/news/${a.slug}`}
              className="group flex flex-col gap-2"
            >
              <div className="h-48 overflow-hidden rounded-md bg-slate-100">
                {a.imageUrl ? (
                  <img
                    src={a.imageUrl}
                    alt={a.title}
                    className="h-full w-full object-cover group-hover:opacity-80"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    📰
                  </div>
                )}
              </div>

              <div className="text-[0.75rem] text-slate-500">
                {a.category} • {a.date}
              </div>

              <h3 className="line-clamp-2 text-[1rem] font-light text-slate-900 group-hover:underline">
                {a.title}
              </h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CategoryPagination({ slug, page, totalPages }) {
  const prevPage = Math.max(page - 1, 1);
  const nextPage = Math.min(page + 1, totalPages);

  return (
    <nav className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
      <Link
        href={page > 1 ? `/category/${slug}?page=${prevPage}` : "#"}
        className={`rounded-md border px-3 py-1.5 ${page > 1 ? "border-slate-300 text-slate-700 hover:bg-slate-50" : "cursor-not-allowed border-slate-200 text-slate-400"}`}
      >
        Previous
      </Link>
      <span className="text-slate-600">
        Page {page} of {totalPages}
      </span>
      <Link
        href={page < totalPages ? `/category/${slug}?page=${nextPage}` : "#"}
        className={`rounded-md border px-3 py-1.5 ${page < totalPages ? "border-slate-300 text-slate-700 hover:bg-slate-50" : "cursor-not-allowed border-slate-200 text-slate-400"}`}
      >
        Next
      </Link>
    </nav>
  );
}

/* ---------- Normalization ---------- */

function getCategoryMeta(slug) {
  switch (slug?.toLowerCase()) {
    case "crypto":
      return { label: "Crypto" };
    case "bitcoin":
      return { label: "Bitcoin" };
    case "ai-news":
      return { label: "AI" };
    case "world-news":
      return { label: "World" };
    case "technology":
      return { label: "Technology" };
    case "business":
      return { label: "Business" };
    case "politics":
      return { label: "Politics" };
    default:
      return { label: "News" };
  }
}

function normalizeArticle(article) {
  return {
    slug: article.slug || article.id,
    title: article.headline || article.title,
    excerpt:
      article.metaDescription || article.summary || article.excerpt || "",
    category:
      article.category ||
      article.primaryCategory ||
      article.tags?.[0] ||
      "News",
    imageUrl:
      article.imageUrl || article.heroImageUrl || article.thumbnail || "",
    date: article.createdAt
      ? new Date(article.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : "",
  };
}

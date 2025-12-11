// app/category/[slug]/page.js
import Link from "next/link";
import RightSidebar from "../../../components/layout/RightSidebar";

/* ---------- TEMP DATA FETCH: get all articles, ignore category ---------- */

async function fetchAllArticles() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/articles?limit=30`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error("Failed to fetch articles for category page:", res.status);
      return [];
    }

    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.error("Error fetching articles for category page:", err);
    return [];
  }
}

/* ---------- Metadata ---------- */

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const safeSlug = slug ?? "news";
  const meta = getCategoryMeta(safeSlug);

  return {
    title: `${meta.label} News | VrajNews`,
    description:
      meta.description ||
      `AI-generated ${meta.label.toLowerCase()} news, summaries, and explainers.`,
  };
}

/* ---------- Page ---------- */

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const safeSlug = slug ?? "news";

  const articles = await fetchAllArticles();
  const categoryMeta = getCategoryMeta(safeSlug);

  if (!articles.length) {
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

  const [heroArticle, ...rest] = articles;
  const gridArticles = rest.slice(0, 3);
  const sidebarArticles = rest.slice(3, 9).length ? rest.slice(3, 9) : rest;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Banner: "Latest in Politics / Business / ..." */}
      <CategoryBanner label={categoryMeta.label} />

      {/* Layout: left (hero + grid) + divider + right sidebar */}
      <div className="lg:flex lg:gap-0">
        {/* LEFT SIDE */}
        <div className="flex-1 space-y-6 lg:pr-8">
          <CategoryHero article={heroArticle} />
          <CategoryGrid articles={gridArticles} />
        </div>

        {/* VERTICAL DIVIDER */}
        <div className="hidden w-px bg-slate-200 mx-6 lg:block" />

        {/* RIGHT SIDE – Shared sidebar */}
        <aside className="mt-6 w-[280px] space-y-6 lg:mt-0 lg:w-[320px] lg:pl-0">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}

/* ---------- Category banner (updated to match design) ---------- */

function CategoryBanner({ label }) {
  return (
    <section className="mt-1 mb-3">
      <div className="flex items-center gap-3">
        {/* Thin vertical red line like the design */}
        <span className="h-4 w-[2px] bg-red-500" />
        <p className="text-sm font-light text-slate-900">
          Latest in {label}
        </p>
      </div>
    </section>
  );
}

/* ---------- Hero section (big article row) ---------- */

function CategoryHero({ article }) {
  if (!article) return null;
  const a = normalizeArticle(article);

  return (
    <section className="mt-2">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)] md:items-stretch">
        {/* Left: text */}
        <div className="flex flex-col justify-start gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-[0.8rem]">
              <span className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-[0.8rem] font-normal text-red-600">
                {a.category}
              </span>
              {a.date && (
                <span className="text-[0.8rem] font-light text-slate-500">
                  {a.date}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-light leading-snug sm:text-3xl lg:text-[2.1rem]">
              <Link
                href={`/news/${a.slug}`}
                className="hover:underline underline-offset-[3px] decoration-red-500"
              >
                {a.title}
              </Link>
            </h1>

            {a.excerpt && (
              <p className="max-w-xl text-[0.9rem] leading-relaxed text-slate-600">
                {a.excerpt}
              </p>
            )}
          </div>
        </div>

        {/* Right: image */}
        <div className="relative h-52 w-full overflow-hidden rounded-md bg-slate-100 sm:h-64 md:h-72">
          {a.imageUrl ? (
            <img
              src={a.imageUrl}
              alt={a.title}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <span className="text-6xl">📰</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Grid of 3 cards under hero ---------- */

function CategoryGrid({ articles }) {
  const list = Array.isArray(articles) ? articles : [];
  if (!list.length) return null;

  return (
    <section className="mt-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {list.map((article) => {
          const a = normalizeArticle(article);
          return (
            <Link
              key={a.slug}
              href={`/news/${a.slug}`}
              className="group flex h-full flex-col gap-2"
            >
              {/* Image */}
              <div className="h-48 w-full overflow-hidden rounded-md bg-slate-100">
                {a.imageUrl ? (
                  <img
                    src={a.imageUrl}
                    alt={a.title}
                    className="h-full w-full object-cover object-center transition-opacity duration-200 group-hover:opacity-80"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <span className="text-3xl">📰</span>
                  </div>
                )}
              </div>

              {/* Meta + title */}
              <div className="flex flex-1 flex-col gap-1">
                <div className="text-[0.75rem] font-light text-slate-500">
                  {a.date && `${a.category} • ${a.date}`}
                </div>
                <h3 className="line-clamp-2 text-[1rem] font-light text-slate-900 group-hover:underline underline-offset-[3px]">
                  {a.title}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Right-side featured list (currently unused) ---------- */

function CategoryFeaturedSidebar({ label, articles }) {
  const list = Array.isArray(articles) ? articles.slice(0, 5) : [];
  if (!list.length) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-[16px] w-[6px] rounded-[2px] bg-red-500" />
        <h2 className="text-sm font-light text-slate-900">{label}</h2>
      </div>

      <div className="space-y-4">
        {list.map((article) => {
          const a = normalizeArticle(article);
          return (
            <Link
              key={a.slug}
              href={`/news/${a.slug}`}
              className="group flex gap-3"
            >
              <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                {a.imageUrl ? (
                  <img
                    src={a.imageUrl}
                    alt={a.title}
                    className="h-full w-full object-cover object-center group-hover:opacity-90"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <span className="text-2xl">📰</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-[0.7rem] text-slate-500">
                  {a.category} {a.date && <>• {a.date}</>}
                </div>
                <div className="line-clamp-2 text-[0.85rem] font-light text-slate-900 group-hover:underline underline-offset-[3px]">
                  {a.title}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Helpers ---------- */

function getCategoryMeta(slug) {
  const key = (slug || "news").toLowerCase();

  switch (key) {
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
  const slug = article.slug || article.id || "#";
  const title = article.headline || article.title || "Untitled article";
  const excerpt =
    article.metaDescription || article.summary || article.excerpt || "";
  const category =
    article.category ||
    article.primaryCategory ||
    (Array.isArray(article.tags) && article.tags[0]) ||
    "Business";
  const imageUrl =
    article.imageUrl || article.heroImageUrl || article.thumbnail || "";

  const date = article.createdAt
    ? new Date(article.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "";

  return { slug, title, excerpt, category, imageUrl, date };
}

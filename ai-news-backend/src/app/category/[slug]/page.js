// app/category/[slug]/page.js
import Link from "next/link";
import RightSidebar from "../../../components/layout/RightSidebar";

/* ---------- TEMP DATA FETCH: get all articles ---------- */

async function fetchAllArticles() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/articles?limit=50`, {
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

/* ---------- Helpers ---------- */

function normalizeCategory(value) {
  if (!value) return "";
  return value.toString().trim().toLowerCase();
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

  const allArticles = await fetchAllArticles();
  const categoryMeta = getCategoryMeta(safeSlug);

  // ✅ FIX: FILTER ARTICLES BY CATEGORY
  const filteredArticles = allArticles.filter((article) => {
    const articleCategory =
      article.category ||
      article.primaryCategory ||
      (Array.isArray(article.tags) && article.tags[0]) ||
      "";

    return (
      normalizeCategory(articleCategory) === normalizeCategory(safeSlug)
    );
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
  const gridArticles = rest.length ? rest.slice(0, 3) : [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Banner */}
      <CategoryBanner label={categoryMeta.label} />

      {/* Layout */}
      <div className="lg:flex lg:gap-0">
        {/* LEFT */}
        <div className="flex-1 space-y-6 lg:pr-8">
          <CategoryHero article={heroArticle} />
          <CategoryGrid articles={gridArticles} />
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
            {a.date && (
              <span className="text-slate-500">{a.date}</span>
            )}
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
      <div className="grid gap-4 sm:grid-cols-3">
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

// src/app/authors/[slug]/page.js
import Image from "next/image";
import Link from "next/link";

/* ---------- TEMP DATA FETCH: get all articles ---------- */

async function fetchAllArticles() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/articles?limit=30`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error("Failed to fetch articles for author page:", res.status);
      return [];
    }

    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.error("Error fetching articles for author page:", err);
    return [];
  }
}

/* ---------- Metadata ---------- */

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const meta = getAuthorMeta(slug);

  return {
    title: `${meta.name} | Author at VrajNews`,
    description:
      meta.tagline ||
      `Articles and explainers written by ${meta.name} at VrajNews.`,
  };
}

/* ---------- Page ---------- */

export default async function AuthorPage({ params }) {
  const { slug } = await params;
  const authorMeta = getAuthorMeta(slug);

  const allArticles = await fetchAllArticles();

  // Try to filter by author name, fallback to all articles
  const filtered = allArticles.filter((a) => {
    const name = (a.authorName || a.sourceName || "").toLowerCase().trim();
    return name === authorMeta.name.toLowerCase();
  });

  const articles = filtered.length ? filtered : allArticles;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Banner: Meet our author */}
      <AuthorBanner />

      <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2.1fr)] lg:gap-10">
        {/* LEFT COLUMN – author profile */}
        <aside className="mb-8 lg:mb-0 lg:border-r lg:border-slate-200 lg:pr-10">
          <AuthorProfile meta={authorMeta} />
        </aside>

        {/* RIGHT COLUMN – latest articles */}
        <main className="lg:pl-8">
          <LatestFromAuthor name={authorMeta.name} articles={articles} />
        </main>
      </div>
    </div>
  );
}

/* ---------- Banner at top ---------- */

function AuthorBanner() {
  return (
    <section className="mt-1 mb-3">
      <div className="flex items-center gap-3">
        <span className="h-4 w-[2px] bg-red-500" />
        <p className="text-sm font-light text-slate-900">Meet our author</p>
      </div>
    </section>
  );
}

/* ---------- Left profile column ---------- */

function AuthorProfile({ meta }) {
  const { name, role, bioParagraphs, email } = meta;

  return (
    <div className="space-y-6">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-4 sm:items-start">
        <div className="relative h-28 w-28 overflow-hidden rounded-full bg-slate-200">
          {/* If you add a real image, place it in /public/authors/<slug>.jpg and update meta.avatar */}
          {meta.avatar ? (
            <Image
              src={meta.avatar}
              alt={name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-slate-600">
              {name.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{name}</h1>
          {role && (
            <p className="mt-1 text-sm font-light text-slate-500">{role}</p>
          )}
        </div>
      </div>

      {/* Bio paragraphs */}
      <div className="space-y-3 text-[0.9rem] leading-relaxed text-slate-600">
        {bioParagraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
      </div>

      {/* Contact + social */}
      <div className="space-y-2 pt-2">
        <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
        {email && (
          <p className="text-sm text-slate-600">
            <a href={`mailto:${email}`} className="hover:underline">
              {email}
            </a>
          </p>
        )}

        <div className="mt-2 flex items-center gap-3 text-slate-500">
          {/* simple icon circles – replace with real SVGs if you want */}
          <SocialIcon label="Facebook" />
          <SocialIcon label="Twitter" />
          <SocialIcon label="Instagram" />
          <SocialIcon label="LinkedIn" />
        </div>
      </div>
    </div>
  );
}

function SocialIcon({ label }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-[11px] text-slate-500 hover:border-slate-400 hover:text-slate-700"
    >
      {/* Initial letter as a placeholder icon */}
      {label.charAt(0)}
    </button>
  );
}

/* ---------- Right column: latest from author ---------- */

function LatestFromAuthor({ name, articles }) {
  const list = Array.isArray(articles) ? articles : [];
  const normalized = list.map(normalizeArticle);

  return (
    <section>
      {/* Header row: red line + title */}
      <div className="mb-4 flex items-center gap-3">
        <span className="h-4 w-[2px] bg-red-500" />
        <h2 className="text-sm font-light text-slate-900">
          Latest articles from {name}
        </h2>
      </div>

      {normalized.length === 0 ? (
        <p className="text-sm text-slate-500">
          No articles found for this author yet.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {normalized.map((a) => (
            <Link
              key={a.slug}
              href={`/news/${a.slug}`}
              className="group flex h-full flex-col gap-2"
            >
              {/* Image */}
              <div className="h-40 w-full overflow-hidden rounded-md bg-slate-100 sm:h-44 md:h-48">
                {a.imageUrl ? (
                  <img
                    src={a.imageUrl}
                    alt={a.title}
                    className="h-full w-full object-cover object-center transition-opacity duration-200 group-hover:opacity-85"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <span className="text-3xl">📰</span>
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="flex flex-1 flex-col gap-1">
                <div className="text-[0.75rem] font-light text-slate-500">
                  {a.category} {a.date && <>• {a.date}</>}
                </div>
                <h3 className="line-clamp-2 text-[0.95rem] font-light text-slate-900 group-hover:underline underline-offset-[3px]">
                  {a.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Helpers ---------- */

function getAuthorMeta(slug) {
  const key = (slug || "").toLowerCase();

  // You can add more authors here later
  if (key === "james-carter") {
    return {
      slug: "james-carter",
      name: "James Carter",
      role: "Economics, Business and Finance",
      // If you add an avatar, put it in /public/authors/james-carter.jpg
      avatar: "/authors/james-carter.jpg", // optional placeholder
      tagline:
        "James Carter covers economic policy, business trends, and financial markets.",
      bioParagraphs: [
        "James graduated from the London School of Economics with a degree in Economics. Specializing in economics, business, and finance, he has spent a decade analyzing global markets and financial systems.",
        "He has authored several award-winning articles on economic policies and their impact on society, contributing to both academic journals and mainstream media.",
        "He frequently speaks at financial conferences and has been a guest lecturer at top universities.",
      ],
      email: "j.carter@newsflash.com",
    };
  }

  // Default fallback author meta
  return {
    slug: key || "author",
    name: "Staff Writer",
    role: "Markets and Technology",
    avatar: "",
    tagline: "",
    bioParagraphs: [
      "This staff writer covers a mix of markets, technology, and macroeconomic trends for VrajNews.",
    ],
    email: "editor@newsflash.com",
  };
}

function normalizeArticle(article) {
  const slug = article.slug || article.id || "#";
  const title = article.headline || article.title || "Untitled article";
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

  return { slug, title, category, imageUrl, date };
}

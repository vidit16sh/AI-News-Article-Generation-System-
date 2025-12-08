import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import FeaturedSidebar from "./FeaturedSidebar";

// 1. Fetch Data Function
async function getArticle(slug) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/articles/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;
    return await res.json(); // expected: { article, relatedArticles }
  } catch (error) {
    console.error("Error fetching article:", error);
    return null;
  }
}

// 2. SEO Metadata
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getArticle(slug);

  if (!data?.article) {
    return { title: "Article Not Found" };
  }

  const { article } = data;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const url = `${baseUrl}/news/${article.slug}`;
  const image = article.imageUrl || `${baseUrl}/default-og-image.png`;

  return {
    title: article.headline,
    description: article.metaDescription || article.excerpt || article.headline,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: article.headline,
      description: article.metaDescription || article.excerpt || article.headline,
      url,
      type: "article",
      images: [image],
      siteName: "Crypto AI News",
    },
    twitter: {
      card: "summary_large_image",
      title: article.headline,
      description: article.metaDescription || article.excerpt || article.headline,
      images: [image],
    },
  };
}

// 3. Page Component
export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const data = await getArticle(slug);

  if (!data || !data.article) {
    notFound();
  }

  const { article, relatedArticles } = data;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const articleUrl = `${baseUrl}/news/${article.slug}`;

  const category =
    article.category ||
    article.primaryCategory ||
    article.tags?.[0] ||
    "News";

  const publishedDate = article.createdAt
    ? new Date(article.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const authorName = article.authorName || article.sourceName || "AI Writer";
  const readingTime = article.readingTime || "3";

  // JSON-LD for Google News / rich results
  const jsonLd = article.newsJsonLd || {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    description: article.metaDescription || article.excerpt || article.headline,
    image: article.imageUrl ? [article.imageUrl] : [],
    datePublished: article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    author: [
      {
        "@type": "Organization",
        name: authorName,
      },
    ],
    publisher: {
      "@type": "Organization",
      name: "Crypto AI News",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
  };

  const sidebarArticles = Array.isArray(relatedArticles) ? relatedArticles : [];
  const relatedForMain = sidebarArticles.slice(0, 6); // up to 6 related cards

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-0">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="mb-4 text-xs font-medium text-slate-500"
      >
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-slate-800">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/news" className="hover:text-slate-800">
              News
            </Link>
          </li>
          <li>/</li>
          <li
            className="truncate max-w-[55vw] text-slate-700 lg:max-w-xs"
            aria-current="page"
          >
            {article.headline}
          </li>
        </ol>
      </nav>

      {/* Desktop: left / divider / right. Mobile: stacked (unchanged) */}
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,3.2fr)_1px_minmax(260px,1fr)] lg:items-start lg:gap-8">
        {/* MAIN ARTICLE COLUMN */}
        <main
          className="lg:pr-8"
          itemScope
          itemType="https://schema.org/NewsArticle"
        >
          {/* Top meta section */}
          <header className="mb-6 border-b border-slate-200 pb-5">
            <div className="mb-3">
              <span className="inline-flex items-center rounded-md border border-red-100 bg-red-50 px-3 py-1 text-[0.7rem] font-medium tracking-wide text-red-600">
                {category}
              </span>
            </div>

            <h1
              itemProp="headline"
              className="mb-4 text-3xl font-light leading-tight text-slate-900 sm:text-[2.2rem]"
            >
              {article.headline}
            </h1>

            {/* Author row */}
            <div className="flex flex-wrap items-center gap-3 text-[0.8rem] text-slate-500">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[0.75rem] font-medium text-slate-700">
                  {authorName.charAt(0)}
                </div>
                <span className="text-slate-700">{authorName}</span>
              </div>

              <span className="hidden text-slate-400 sm:inline">•</span>

              <div className="flex flex-wrap items-center gap-2">
                {publishedDate && (
                  <time
                    itemProp="datePublished"
                    dateTime={article.createdAt}
                    className="text-slate-500"
                  >
                    {publishedDate}
                  </time>
                )}
                <span className="text-slate-400">•</span>
                <span>{readingTime} min read</span>
              </div>
            </div>
          </header>

          {/* Hero image */}
          {article.imageUrl && (
            <figure className="mb-8 overflow-hidden rounded-md bg-slate-100">
              <div className="relative h-64 w-full sm:h-80 lg:h-[420px]">
                <Image
                  src={article.imageUrl}
                  alt={article.headline}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 800px"
                />
              </div>
              {article.imageCaption && (
                <figcaption className="px-2 py-2 text-[0.7rem] text-slate-500 sm:px-0">
                  {article.imageCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Body + share bar (desktop) */}
          <div className="lg:flex lg:items-start lg:gap-6">
            {/* Share column – desktop only */}
            <div className="hidden text-slate-400 lg:flex lg:flex-col lg:items-center lg:gap-4 lg:pt-1">
              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
                Share
              </span>
              <ShareIcon label="Facebook" abbr="f" />
              <ShareIcon label="Twitter" abbr="t" />
              <ShareIcon label="LinkedIn" abbr="in" />
              <ShareIcon label="Email" abbr="@" />
            </div>

            {/* Article body – spacing tuned for readability */}
            <section
              itemProp="articleBody"
              className="
                prose prose-slate max-w-none
                prose-p:my-5
                prose-p:text-[0.97rem]
                prose-li:my-2
                prose-headings:mt-8 prose-headings:mb-3
                prose-headings:font-semibold
                prose-a:text-blue-600 hover:prose-a:text-blue-700
                leading-relaxed
              "
              dangerouslySetInnerHTML={{ __html: article.articleHtml }}
            />
          </div>

          {/* RELATED ARTICLES SECTION */}
          {relatedForMain.length > 0 && (
            <RelatedArticlesSection articles={relatedForMain} />
          )}
        </main>

        {/* VERTICAL DIVIDER – very thin line, desktop only */}
        <div className="hidden h-full bg-slate-200 lg:block" />

        {/* RIGHT SIDEBAR – sticky on desktop */}
        <aside className="mt-8 w-full lg:sticky lg:top-24 lg:mt-0 lg:w-full lg:self-start lg:pl-4">
          <FeaturedSidebar articles={sidebarArticles} />
        </aside>
      </div>
    </div>
  );
}

/* --------- Small share icon component --------- */

function ShareIcon({ label, abbr }) {
  return (
    <button
      type="button"
      aria-label={`Share on ${label}`}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-[0.7rem] font-semibold uppercase text-slate-500 hover:border-red-500 hover:text-red-600"
    >
      {abbr}
    </button>
  );
}

/* --------- Related Articles Section --------- */

function RelatedArticlesSection({ articles }) {
  const normalized = articles.map((a) => normalizeRelated(a));

  return (
    <section className="mt-10">
      {/* Heading row with red bar + title */}
      <div className="mb-4 flex items-center gap-2">
        <span className="h-[16px] w-[6px] rounded-[2px] bg-red-500" />
        <h2 className="text-[1rem] sm:text-[1.1rem] font-light text-slate-900">
          Related Articles
        </h2>
      </div>

      {/* Cards grid */}
      <div className="grid gap-6 md:grid-cols-3 sm:grid-cols-2">
        {normalized.map((a) => (
          <Link
            key={a.slug}
            href={`/news/${a.slug}`}
            className="group block"
          >
            {/* Image */}
            <div className="relative mb-3 h-44 w-full overflow-hidden rounded-md bg-slate-100 sm:h-48">
              {a.imageUrl ? (
                <Image
                  src={a.imageUrl}
                  alt={a.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 360px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <span className="text-4xl">📰</span>
                </div>
              )}
            </div>

            {/* Meta row */}
            <div className="mb-1 text-[0.8rem] font-light text-slate-500">
              {a.category && (
                <>
                  {a.category}
                  {a.date && " • "}
                </>
              )}
              {a.date}
            </div>

            {/* Title */}
            <h3 className="line-clamp-3 text-[0.98rem] font-light leading-snug text-slate-900 group-hover:underline underline-offset-[3px]">
              {a.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}

function normalizeRelated(article) {
  const slug = article.slug || article.id || "#";
  const title = article.headline || article.title || "Untitled article";
  const category =
    article.category ||
    article.primaryCategory ||
    article.tags?.[0] ||
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

  return {
    slug,
    title,
    category,
    imageUrl,
    date,
  };
}

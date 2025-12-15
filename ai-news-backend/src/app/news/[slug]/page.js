import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import RightSidebar from "../../../components/layout/RightSidebar";

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
    article.category || article.primaryCategory || article.tags?.[0] || "News";

  const publishedDate = article.createdAt
    ? new Date(article.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  // ✅ Use author stored in DB; fallback only if missing
  const author = article.author || {
    name: "Editorial Team",
    role: "AI News Desk",
    slug: "editorial-team",
    imageUrl: null,
  };

  const authorName = author?.name || "Editorial Team";
  const authorSlug = author?.slug || null;

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
        "@type": "Person",
        name: authorName,
        url: authorSlug ? `${baseUrl}/authors/${authorSlug}` : undefined,
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
        className="mb-6 text-xs font-medium text-slate-500"
      >
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-slate-800 transition-colors">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/news" className="hover:text-slate-800 transition-colors">
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

      {/* Layout wrapper – Increased gap to gap-12 for better separation */}
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,1fr)] lg:items-start lg:gap-12">
        
        {/* MAIN ARTICLE COLUMN */}
        <main
          className="lg:pr-0"
          itemScope
          itemType="https://schema.org/NewsArticle"
        >
          {/* Top meta section */}
          <header className="mb-8 border-b border-slate-200 pb-8">
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                {category}
              </span>
            </div>

            <h1
              itemProp="headline"
              className="mb-6 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]"
            >
              {article.headline}
            </h1>

            {/* Author row */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                   {author.imageUrl ? (
                       <Image src={author.imageUrl} alt={authorName} width={40} height={40} className="object-cover" />
                   ) : (
                       <span className="text-sm font-bold text-slate-500">{authorName.charAt(0)}</span>
                   )}
                </div>

                <div className="flex flex-col text-sm">
                    {/* ✅ Make author clickable if slug exists */}
                    {authorSlug ? (
                      <Link
                        href={`/authors/${authorSlug}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {authorName}
                      </Link>
                    ) : (
                      <span className="font-semibold text-slate-900">{authorName}</span>
                    )}
                    <span className="text-slate-500">{author.role || "Contributor"}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-500">
                {publishedDate && (
                  <time
                    itemProp="datePublished"
                    dateTime={article.createdAt}
                  >
                    {publishedDate}
                  </time>
                )}
                <span>·</span>
                <span>{readingTime} min read</span>
              </div>
            </div>
          </header>

          {/* Hero image */}
          {article.imageUrl && (
            <figure className="mb-10 overflow-hidden rounded-2xl shadow-sm">
              <div className="relative aspect-[16/9] w-full bg-slate-100">
                <Image
                  src={article.imageUrl}
                  alt={article.headline}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>
              {article.imageCaption && (
                <figcaption className="mt-3 text-center text-sm italic text-slate-500">
                  {article.imageCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Content Body Layout */}
          <div className="relative flex gap-8">
            {/* Share column – desktop sticky */}
            <div className="hidden lg:block lg:w-12 lg:flex-none">
              <div className="sticky top-32 flex flex-col gap-4">
                <ShareIcon label="Facebook" abbr="F" />
                <ShareIcon label="Twitter" abbr="T" />
                <ShareIcon label="LinkedIn" abbr="L" />
                <ShareIcon label="Email" abbr="@" />
              </div>
            </div>

            {/* Article body – FIXED: Clean class string without comments */}
      <section
  itemProp="articleBody"
  className="
    prose prose-lg prose-slate max-w-none flex-1
    prose-h1:hidden
    prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
    prose-h2:mt-14 prose-h2:mb-6 prose-h2:text-3xl prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-2
    prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-2xl
    prose-p:leading-8 prose-p:text-slate-700 prose-p:my-7
    prose-li:text-slate-700 prose-li:my-3
    prose-a:font-medium prose-a:text-blue-600 prose-a:no-underline prose-a:transition hover:prose-a:text-blue-800 hover:prose-a:underline
    prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:bg-slate-50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:font-medium prose-blockquote:text-slate-800 prose-blockquote:rounded-r-lg
    prose-img:rounded-xl prose-img:shadow-md prose-img:my-10
    prose-strong:font-bold prose-strong:text-slate-900
  "
  dangerouslySetInnerHTML={{ __html: article.articleHtml }}
/>
          </div>

          {/* ✅ Disclaimer */}
          <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
            <p>
              <strong>Disclaimer:</strong> The information provided is not trading
              advice, coinmarketbuzz.com holds no liability for any investments
              made based on the information provided on this page. We strongly
              recommend independent research and/or consultation with a qualified
              professional before making any investment decisions.
            </p>
          </div>

          {/* RELATED ARTICLES SECTION */}
          {relatedForMain.length > 0 && (
            <RelatedArticlesSection articles={relatedForMain} />
          )}
        </main>

        {/* VERTICAL DIVIDER – very thin line, desktop only */}
        <div className="hidden h-full w-px bg-slate-200 lg:block" />

        {/* RIGHT SIDEBAR – sticky on desktop */}
        <aside className="mt-8 w-full lg:sticky lg:top-24 lg:mt-0 lg:pl-4">
          <RightSidebar />
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
      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-[0.7rem] font-semibold uppercase text-slate-500 hover:border-red-500 hover:text-red-600 hover:bg-slate-50 transition-colors"
    >
      {abbr}
    </button>
  );
}

/* --------- Related Articles Section --------- */

function RelatedArticlesSection({ articles }) {
  const normalized = articles.map((a) => normalizeRelated(a));

  return (
    <section className="mt-16 border-t border-slate-200 pt-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="h-6 w-1.5 rounded-full bg-red-600" />
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Related Articles
        </h2>
      </div>

      <div className="grid gap-8 md:grid-cols-3 sm:grid-cols-2">
        {normalized.map((a) => (
          <Link key={a.slug} href={`/news/${a.slug}`} className="group block">
            <div className="relative mb-4 aspect-[3/2] w-full overflow-hidden rounded-lg bg-slate-100 shadow-sm">
              {a.imageUrl ? (
                <Image
                  src={a.imageUrl}
                  alt={a.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 360px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <span className="text-4xl">📰</span>
                </div>
              )}
            </div>

            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
              {a.category && (
                <span className="text-blue-600 uppercase tracking-wide">
                  {a.category}
                </span>
              )}
              {a.date && <span>• {a.date}</span>}
            </div>

            <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 group-hover:text-blue-700 transition-colors">
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
    article.category || article.primaryCategory || article.tags?.[0] || "Business";
  const imageUrl = article.imageUrl || article.heroImageUrl || article.thumbnail || "";

  const date = article.createdAt
    ? new Date(article.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "";

  return { slug, title, category, imageUrl, date };
}
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import RightSidebar from "../../../components/layout/RightSidebar";
import AuthorBioBox from "../../../components/article/AuthorBioBox";

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

  // ✅ JSON-LD (NewsArticle schema) from API
  const newsJsonLdRaw = article?.newsJsonLd;
  let newsJsonLd = null;

  try {
    newsJsonLd =
      typeof newsJsonLdRaw === "string"
        ? JSON.parse(newsJsonLdRaw)
        : newsJsonLdRaw;
  } catch (e) {
    console.warn("Invalid newsJsonLd JSON:", e);
    newsJsonLd = null;
  }

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

  const author = article.author || {
    name: "Editorial Team",
    role: "AI News Desk",
    slug: null,
    imageUrl: null,
  };

  const authorName = author?.name || "Editorial Team";
  const authorSlug = author?.slug || null;
  const readingTime = article.readingTime || "3";

  const sidebarArticles = Array.isArray(relatedArticles)
    ? relatedArticles
    : [];
  const relatedForMain = sidebarArticles.slice(0, 6);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-0">
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
            <Link
              href="/news"
              className="hover:text-slate-800 transition-colors"
            >
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

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,1fr)] lg:items-start lg:gap-12">
        {/* MAIN ARTICLE COLUMN */}
        <main
          className="lg:pr-0"
          itemScope
          itemType="https://schema.org/NewsArticle"
        >
          {/* ✅ Inject NewsArticle JSON-LD for Google */}
          {newsJsonLd && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }}
            />
          )}

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
                    <Image
                      src={author.imageUrl}
                      alt={authorName}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-500">
                      {authorName.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col text-sm">
                  {authorSlug ? (
                    <Link
                      href={`/authors/${authorSlug}`}
                      className="font-semibold text-slate-900 hover:underline"
                    >
                      {authorName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-slate-900">
                      {authorName}
                    </span>
                  )}
                  <span className="text-slate-500">
                    {author.role || "Contributor"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-500">
                {publishedDate && (
                  <time itemProp="datePublished" dateTime={article.createdAt}>
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
            {/* Share column */}
            <div className="hidden lg:block lg:w-12 lg:flex-none">
              <div className="sticky top-32 flex flex-col gap-4">
                <ShareIcon label="Facebook" abbr="F" />
                <ShareIcon label="Twitter" abbr="T" />
                <ShareIcon label="LinkedIn" abbr="L" />
                <ShareIcon label="Email" abbr="@" />
              </div>
            </div>

            {/* ✅ Article body (ONLY ONCE) */}
            <section
              itemProp="articleBody"
              className="
                article-prose
                prose prose-lg max-w-none
                prose-h1:hidden
                prose-h2:mt-12 prose-h2:mb-3 prose-h2:text-[1.75rem] prose-h2:font-semibold prose-h2:tracking-tight
                prose-h3:mt-8 prose-h3:mb-2 prose-h3:text-[1.35rem] prose-h3:font-semibold
                prose-p:text-slate-800 prose-p:leading-[1.85]
                prose-ul:my-4 prose-ol:my-4
                prose-li:my-1
                prose-blockquote:my-8 prose-blockquote:border-l-4 prose-blockquote:border-slate-900
                prose-blockquote:bg-slate-50 prose-blockquote:px-6 prose-blockquote:py-4
                prose-blockquote:not-italic
                prose-a:text-blue-700 prose-a:font-medium hover:prose-a:underline
              "
              dangerouslySetInnerHTML={{ __html: article.articleHtml }}
            />
          </div>

          {/* ✅ Author Bio Box (after content) */}
          <AuthorBioBox author={article.author} />

          {/* Disclaimer */}
          <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
            <p>
              <strong>Disclaimer:</strong> The information provided is not trading
              advice. CoinMarketBuzz holds no liability for investment decisions.
            </p>
          </div>

          {/* RELATED ARTICLES */}
          {relatedForMain.length > 0 && (
            <RelatedArticlesSection articles={relatedForMain} />
          )}
        </main>

        <div className="hidden h-full w-px bg-slate-200 lg:block" />

        <aside className="mt-8 w-full lg:sticky lg:top-24 lg:mt-0 lg:pl-4">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}

/* --------- Share Icon --------- */

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
            <h3 className="text-lg font-bold leading-snug text-slate-900 group-hover:text-blue-700 transition-colors">
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

  return { slug, title, category, imageUrl, date };
}

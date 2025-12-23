// src/app/news/[slug]/page.js
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import RightSidebar from "../../../components/layout/RightSidebar";
import AuthorBioBox from "../../../components/article/AuthorBioBox";

// ✅ Icons (lucide-react)
import { Facebook, Twitter, Linkedin, Mail } from "lucide-react";

// 1. Fetch Data Function
async function getArticle(slug) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com";

  try {
    const res = await fetch(`${baseUrl}/api/articles/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;
    return await res.json();
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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com";

  const url = `${baseUrl}/news/${article.slug}`;
  const image =
    article.imageUrl && article.imageUrl.startsWith("http")
      ? article.imageUrl
      : `${baseUrl}${article.imageUrl || "/default-og-image.png"}`;

  return {
    title: article.headline,
    description: article.metaDescription || article.excerpt || article.headline,
    alternates: { canonical: url },
    openGraph: {
      title: article.headline,
      description: article.metaDescription || article.excerpt || article.headline,
      url,
      type: "article",
      images: [image],
      siteName: "CoinMarketBuzz",
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

  if (!data || !data.article) notFound();

  const { article, relatedArticles } = data;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com";

  // ✅ DATA PREP FOR JSON-LD
  const publishedISO = new Date(article.publishAt || article.createdAt).toISOString();
  const modifiedISO = new Date(article.updatedAt || article.publishAt || article.createdAt).toISOString();
  
  const absoluteImage = article.imageUrl?.startsWith("http")
    ? article.imageUrl
    : `${baseUrl}${article.imageUrl || "/default-news.jpg"}`;

  // ✅ PERFECTED JSON-LD (Removed Warnings)
  const newsJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.headline,
    "description": article.metaDescription || article.excerpt || article.headline,
    "image": [absoluteImage], 
    "datePublished": publishedISO,
    "dateModified": modifiedISO,
    "author": [{
      "@type": "Person",
      "name": article.author?.name || "CoinMarketBuzz Staff",
      "url": article.author?.slug 
        ? `${baseUrl}/authors/${article.author.slug}` 
        : `${baseUrl}/about`
    }],
    "publisher": {
      "@type": "Organization",
      "name": "CoinMarketBuzz",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/brand/logo.png` 
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/news/${article.slug}`
    }
  };

  const category = article.category || article.primaryCategory || article.tags?.[0] || "News";

  const publishedDate = article.publishAt || article.createdAt
    ? new Date(article.publishAt || article.createdAt).toLocaleDateString("en-US", {
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

  const sidebarArticles = Array.isArray(relatedArticles) ? relatedArticles : [];
  const relatedForMain = sidebarArticles.slice(0, 6);

  const articleUrl = `${baseUrl}/news/${article.slug}`;
  const shareText = article.headline || "Check this out";

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(articleUrl)}`,
  };

  return (
    <div className="mx-auto max-w-[1440px] lg:px-0">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,1fr)] lg:items-start lg:gap-8">
        
        {/* ✅ Injected cleaned Metadata */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }}
        />

        {/* MAIN ARTICLE COLUMN (itemScope/itemType removed to fix warnings) */}
        <main className="lg:pr-0">
          <header className="mb-8 pb-4">
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 rounded-md border border-[#f7d9d9] bg-[#fcf2f2] px-3 py-1 text-[0.8rem] text-[#cc0000]">
                {category}
              </span>
            </div>

            <h1 className="mb-4 text-2xl font-normal text-slate-900 sm:text-3xl lg:text-[2.2rem]">
              {article.headline}
            </h1>

            {/* MOBILE AUTHOR ROW */}
            <div className="sm:hidden text-sm text-slate-600">
              <span className="text-slate-500">By: </span>
              {authorSlug ? (
                <Link href={`/authors/${authorSlug}`} className="font-normal text-slate-900 hover:underline">
                  {authorName}
                </Link>
              ) : (
                <span className="font-normal text-slate-900">{authorName}</span>
              )}
              {publishedDate && (
                <>
                  <span className="mx-2 inline-block h-1 w-1 align-middle rounded-full bg-red-600" />
                  <time className="text-slate-500">
                    {publishedDate}
                  </time>
                </>
              )}
            </div>

            {/* DESKTOP AUTHOR ROW */}
            <div className="hidden sm:flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                  {author.imageUrl ? (
                    <Image
                      src={author.imageUrl}
                      alt={authorName}
                      width={36}
                      height={36}
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-sm font-extralight text-slate-500">
                      {authorName.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {authorSlug ? (
                    <Link href={`/authors/${authorSlug}`} className="font-normal text-slate-900 hover:underline">
                      {authorName}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-900">{authorName}</span>
                  )}

                  {publishedDate && <span className="h-1 w-1 rounded-full bg-red-600" />}

                  {publishedDate && (
                    <time className="text-slate-500">
                      {publishedDate}
                    </time>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Hero image */}
          {article.imageUrl && (
            <figure className="mb-10 overflow-hidden rounded-2xl shadow-sm">
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-slate-100">
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

          <div className="relative flex gap-8">
            {/* Share column */}
            <div className="hidden lg:block lg:w-12 lg:flex-none">
              <div className="sticky top-32 flex flex-col gap-3">
                <ShareIcon label="Facebook" href={shareLinks.facebook} icon={<Facebook className="h-4 w-4" />} />
                <ShareIcon label="Twitter" href={shareLinks.twitter} icon={<Twitter className="h-4 w-4" />} />
                <ShareIcon label="LinkedIn" href={shareLinks.linkedin} icon={<Linkedin className="h-4 w-4" />} />
                <ShareIcon label="Email" href={shareLinks.email} icon={<Mail className="h-4 w-4" />} isMail />
              </div>
            </div>

            {/* Article body */}
            <section
              className="article-prose prose prose-lg max-w-none prose-h1:hidden prose-h2:mt-12 prose-h2:mb-3 prose-h2:text-[1.6rem] prose-h2:font-semibold prose-h2:tracking-tight prose-h3:mt-8 prose-h3:mb-2 prose-h3:text-[1.25rem] prose-h3:font-semibold prose-p:text-slate-800 prose-p:leading-[1.85] prose-ul:my-4 prose-ol:my-4 prose-li:my-1 prose-blockquote:my-8 prose-blockquote:border-l-4 prose-blockquote:border-slate-900 prose-blockquote:bg-slate-50 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:not-italic prose-a:text-blue-700 prose-a:font-medium hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: article.articleHtml }}
            />
          </div>

          <AuthorBioBox author={article.author} />

          <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
            <p>
              <strong>Disclaimer:</strong> The information provided is not trading advice, <a href="https://coinmarketbuzz.com" className="underline">coinmarketbuzz.com</a> holds no liability for any investments made based on the information provided on this page. We strongly recommend independent research and/or consultation with a qualified professional before making any investment decisions. <br></br>
              <a href="https://coinmarketbuzz.com" className="underline">coinmarketbuzz.com</a> leverages advanced AI technology to analyze market data. All content is fact-checked and reviewed by our editorial team to ensure accuracy and neutrality.
            </p>
          </div>

          {relatedForMain.length > 0 && <RelatedArticlesSection articles={relatedForMain} />}
        </main>

        <div className="hidden h-full w-px bg-slate-200 lg:block" />

        <aside className="mt-8 w-full lg:sticky lg:top-24 lg:mt-0">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}

// ... ShareIcon and Related Section helpers remain the same ...

function ShareIcon({ label, href, icon, isMail = false }) {
  return (
    <a
      href={href}
      aria-label={`Share on ${label}`}
      target={isMail ? undefined : "_blank"}
      rel={isMail ? undefined : "noreferrer noopener"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:border-red-500 hover:text-red-600 hover:bg-slate-50 transition-colors"
    >
      {icon}
    </a>
  );
}

function RelatedArticlesSection({ articles }) {
  const normalized = articles.map((a) => normalizeRelated(a));

  return (
    <section className="mt-16 border-t border-slate-200 pt-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-red-600" />
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Related Articles
        </h2>
      </div>

      <div className="grid gap-8 md:grid-cols-3 sm:grid-cols-2">
        {normalized.map((a) => (
          <RelatedCard key={a.slug} article={a} />
        ))}
      </div>
    </section>
  );
}

function RelatedCard({ article }) {
  const a = article;
  return (
    <Link href={`/news/${a.slug}`} className="group flex h-full flex-row gap-3 md:flex-col">
      <div className="relative overflow-hidden rounded-md bg-slate-100 h-24 w-28 flex-none sm:h-28 md:h-48 md:w-full">
        {a.imageUrl ? (
          <Image
            src={a.imageUrl}
            alt={a.title}
            fill
            className="object-cover transition-opacity duration-200 group-hover:opacity-80"
            sizes="(max-width: 768px) 35vw, 30vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <span className="text-3xl">📰</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="text-[0.75rem] font-light text-slate-500">
          {a.date && `${a.date} • `}
          <span>{a.category}</span>
        </div>
        <h3 className="line-clamp-2 text-[1rem] sm:text-[1.05rem] font-light text-slate-900 group-hover:underline underline-offset-[3px]">
          {a.title}
        </h3>
      </div>
    </Link>
  );
}

function normalizeRelated(article) {
  const slug = article.slug || article.id || "#";
  const title = article.headline || article.title || "Untitled article";
  const category = article.category || article.primaryCategory || article.tags?.[0] || "Business";
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

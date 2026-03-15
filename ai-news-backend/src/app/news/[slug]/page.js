// src/app/news/[slug]/page.js
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import RightSidebar from "../../../components/layout/RightSidebar";
import AuthorBioBox from "../../../components/article/AuthorBioBox";

// ✅ Icons (lucide-react)
import { Facebook, Twitter, Linkedin, Mail } from "lucide-react"; 

const cleanHeadline = (title) => {
  if (!title) return "";
  return title
    .replace(/^\[Analysis\]\s*/i, "")
    .replace(/^Daily Crypto Analysis:\s*/i, "")
    .trim();
};

const trimTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");

const toTitleCase = (value = "") =>
  String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

const uniqueKeywords = (items = []) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const v = String(item || "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
};

const normalizeArticleHtmlForRender = (html = "") => {
  let out = String(html);

  // Defensive sanitize to prevent duplicate JSON-LD/meta script injection from article body.
  out = out
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  const faqHeadingCount =
    (out.match(/<h2[^>]*>\s*Frequently Asked Questions\s*<\/h2>/gi) || []).length;

  // Remove fallback FAQ block only when duplicate FAQ headings exist.
  if (faqHeadingCount > 1) {
    out = out.replace(
      /<h2[^>]*>\s*Frequently Asked Questions\s*<\/h2>\s*<dl[^>]*class=["'][^"']*faq-section[^"']*["'][^>]*>[\s\S]*?<\/dl>/gi,
      ""
    );
  }

  return out
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const extractFaqItems = (html = "") => {
  const source = String(html || "");
  const items = [];

  const dtRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let m;
  while ((m = dtRe.exec(source)) !== null) {
    const q = String(m[1] || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const a = String(m[2] || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (q && a) items.push({ question: q, answer: a });
    if (items.length >= 8) break;
  }

  if (items.length) return items;

  const qRe = /<p[^>]*>\s*<strong>\s*Q\d+\s*:\s*<\/strong>\s*([\s\S]*?)<br\s*\/?>\s*([\s\S]*?)<\/p>/gi;
  while ((m = qRe.exec(source)) !== null) {
    const q = String(m[1] || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const a = String(m[2] || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (q && a) items.push({ question: q, answer: a });
    if (items.length >= 8) break;
  }
  return items;
};

const hasInlineFaqSection = (html = "") =>
  /<h2[^>]*>\s*(?:Frequently Asked Questions|FAQs?)\s*<\/h2>/i.test(String(html || "")) ||
  /<dl[^>]*class=["'][^"']*faq-section[^"']*["'][^>]*>/i.test(String(html || ""));

const estimateReadingTime = (html = "") => {
  const plain = String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = plain ? plain.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / 220));
};

const slugifyHeading = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const addHeadingAnchors = (html = "") =>
  String(html || "").replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_, attrs = "", content = "") => {
    const plain = String(content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!plain) return `<h2${attrs}>${content}</h2>`;
    const id = slugifyHeading(plain);
    if (/id\s*=/.test(attrs)) return `<h2${attrs}>${content}</h2>`;
    return `<h2 id="${id}"${attrs}>${content}</h2>`;
  });

const extractTocItems = (html = "") => {
  const out = [];
  const re = /<h2[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/h2>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = String(m[1] || "").trim();
    const label = String(m[2] || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!id || !label) continue;
    out.push({ id, label });
  }
  return out.slice(0, 18);
};

// 1. Fetch Data Function
async function getArticle(slug) {
  const publicBaseUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com");
  const internalBaseUrl = process.env.INTERNAL_API_BASE_URL || publicBaseUrl;

  try {
    const res = await fetch(`${internalBaseUrl}/api/articles/${slug}`, {
      next: { revalidate: 60, tags: ['articles', slug], },
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
  const baseUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com");

  const seoTitle = cleanHeadline(article.headline);
  const seoDescription = article.metaDescription || article.excerpt || article.headline;
  const url = `${baseUrl}/news/${article.slug}`;
  const publishedISO = new Date(article.publishAt || article.createdAt).toISOString();
  const modifiedISO = new Date(article.updatedAt || article.publishAt || article.createdAt).toISOString();
  const image =
    article.imageUrl && article.imageUrl.startsWith("http")
      ? article.imageUrl
      : `${baseUrl}${article.imageUrl || "/default-og-image.png"}`;
  const category = toTitleCase(article.category || article.primaryCategory || article.tags?.[0] || "Crypto News");
  const confidenceScore = Number(article.confidenceScore || 0);
  const publishedDate = new Date(article.publishAt || article.createdAt);
  const ageDays = Number.isNaN(publishedDate.getTime())
    ? 999
    : Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));
  const articleStatus = String(
    article.status || (article.publishAt ? "PUBLISHED" : "DRAFT")
  ).toUpperCase();
  const noindexNonPublished = (process.env.NOINDEX_NON_PUBLISHED || "true") === "true";
  const strictNoindexByScore = (process.env.STRICT_NOINDEX_BY_SCORE || "false") === "true";
  const shouldNoindex =
    (noindexNonPublished && articleStatus !== "PUBLISHED") ||
    (strictNoindexByScore &&
      (confidenceScore < 0.75 || (ageDays > 14 && confidenceScore < 0.85)));

  const keywords = uniqueKeywords([
    category,
    article.focus_keywords,
    ...(article.tags || []),
    "CoinMarketBuzz Intelligence",
    "Blockchain News",
  ]);
  const newsKeywords = uniqueKeywords([category, article.focus_keywords, "Crypto News", "Breaking News"]).join(", ");

  return {
    title: seoTitle,
    description: seoDescription,
    keywords,
    alternates: { canonical: url }, 
    robots: {
      index: !shouldNoindex,
      follow: true,
      googleBot: {
        index: !shouldNoindex,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    other: {
      "news_keywords": newsKeywords,
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url,
      type: "article",
      publishedTime: publishedISO,
      modifiedTime: modifiedISO,
      section: category,
      images: [image],
      siteName: "CoinMarketBuzz",
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
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
  const baseUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com");
  
  const displayTitle = cleanHeadline(article.headline);
  const articleUrl = `${baseUrl}/news/${article.slug}`;
  const isAnalysis = (article.headline || "").toLowerCase().includes("analysis"); 
  const category = toTitleCase(article.category || article.primaryCategory || article.tags?.[0] || "News");
  const author = article.author || {
    name: "Editorial Desk",
    role: " News Desk",
    slug: null,
    imageUrl: null,
  }; 
  // ✅ DATA PREP FOR JSON-LD
  const publishedISO = new Date(article.publishAt || article.createdAt).toISOString();
  const modifiedISO = new Date(article.updatedAt || article.publishAt || article.createdAt).toISOString();
  
  const absoluteImage = article.imageUrl?.startsWith("http")
    ? article.imageUrl
    : `${baseUrl}${article.imageUrl || "/default-news.jpg"}`;

  const categorySlug = (article.categorySlug || category || "crypto")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
    { "@type": "ListItem", "position": 2, "name": category, "item": `${baseUrl}/category/${categorySlug}` },
    { "@type": "ListItem", "position": 3, "name": displayTitle, "item": articleUrl }
  ]
  };
  // ✅ PERFECTED JSON-LD (Removed Warnings)
  const newsJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": displayTitle,
    "description": article.metaDescription || article.excerpt || article.headline,
    "image": [absoluteImage], 
    "datePublished": publishedISO,
    "dateModified": modifiedISO, 
    "url": articleUrl,
    "articleSection": category,
    "isAccessibleForFree": true,
    "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": [".article-title", ".executive-summary"]
    },
    "author": [{
      "@type": "Person",
      // Uses "CoinMarketBuzz Staff" for Google Schema if no specific author exists
      "name": article.author?.name || "CoinMarketBuzz Desk", 
      "jobTitle": author.role, 
      "url": author.slug 
        ? `${baseUrl}/authors/${author.slug}` 
        : `${baseUrl}/about`, 
      "knowsAbout": author.expertise || author.focus || ["Blockchain", "Cryptocurrency"] // ✅ E-E-A-T Signal
    }],
    "publisher": {
      "@type": "Organization",
      "name": "CoinMarketBuzz", 
      "url": baseUrl,
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

 
  const publishedDate = article.publishAt || article.createdAt
    ? new Date(article.publishAt || article.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : ""; 
  
  const authorName = author?.name || "Editorial Desk";
  const authorSlug = author?.slug || null;

  const sidebarArticles = Array.isArray(relatedArticles) ? relatedArticles : [];
  const relatedForMain = sidebarArticles.slice(0, 6);

  const shareText = displayTitle || "Check this out";
  const normalizedArticleHtml = normalizeArticleHtmlForRender(article.articleHtml);
  const articleHtml = addHeadingAnchors(normalizedArticleHtml);
  const readingTimeMinutes = estimateReadingTime(articleHtml);
  const tocItems = extractTocItems(articleHtml);
  const dataPackUsed = article.dataPackUsed || null;
  const faqItems = extractFaqItems(articleHtml);
  const shouldRenderFaqQuickView = faqItems.length > 0 && !hasInlineFaqSection(articleHtml);
  const sourceUrl = dataPackUsed?.sourceUrl || article.originalNews?.sourceUrl || "";
  const updatedAtLabel = formatDateTime(article.updatedAt || article.publishAt || article.createdAt);
  const windowStart = formatDateTime(dataPackUsed?.sourcePublishedAt || article.originalNews?.publishedAt);
  const windowEnd = formatDateTime(dataPackUsed?.generatedAt || article.updatedAt || article.publishAt);
  const dataWindowLabel =
    windowStart && windowEnd ? `${windowStart} → ${windowEnd}` : (windowStart || windowEnd || "N/A");

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(articleUrl)}`,
  };

  return (
    <div className="mx-auto max-w-[1440px] overflow-x-clip lg:px-0">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_1px_320px] lg:items-start lg:gap-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }}
        />

        {/* MAIN ARTICLE COLUMN (itemScope/itemType removed to fix warnings) */}
        <main className="min-w-0 lg:pr-0">
          <header className="mb-8 pb-4">
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 rounded-md border border-[#f7d9d9] bg-[#fcf2f2] px-3 py-1 text-[0.8rem] text-[#cc0000]">
                {category}
              </span> 
              {isAnalysis && (
                <span className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-[0.8rem] font-bold uppercase tracking-wider text-blue-700">
                  Analysis
                </span>
              )}
            </div>

            <h1 className="article-title mb-4 text-2xl font-normal text-slate-900 sm:text-3xl lg:text-[2.2rem]">
            {displayTitle}
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
                 <time dateTime={publishedISO} className="text-slate-500">
                    {publishedDate}
                  </time> 
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                Updated: {updatedAtLabel || "N/A"}
              </span>
              <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                Data window: {dataWindowLabel}
              </span>
              <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                Reading time: {readingTimeMinutes} min
              </span>
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
                   <time dateTime={publishedISO} className="text-slate-500">
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

          <div className="relative min-w-0 max-w-full flex gap-8 overflow-x-hidden">
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
              className="article-prose prose prose-lg min-w-0 max-w-none break-words prose-h1:hidden prose-h2:mt-12 prose-h2:mb-3 prose-h2:text-[1.6rem] prose-h2:font-semibold prose-h2:tracking-tight prose-h3:mt-8 prose-h3:mb-2 prose-h3:text-[1.25rem] prose-h3:font-semibold prose-p:text-slate-800 prose-p:leading-[1.85] prose-ul:my-4 prose-ol:my-4 prose-li:my-1 prose-blockquote:my-8 prose-blockquote:border-l-4 prose-blockquote:border-slate-900 prose-blockquote:bg-slate-50 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:not-italic prose-a:text-blue-700 prose-a:font-medium hover:prose-a:underline [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:whitespace-nowrap [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_a]:break-all [&_img]:max-w-full [&_figure]:max-w-full"
              dangerouslySetInnerHTML={{ __html: articleHtml }}
            />
          </div>

          {tocItems.length >= 3 && (
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight text-slate-900">Table of contents</h2>
                <span className="text-xs text-slate-500">{tocItems.length} sections</span>
              </div>
              <ol className="space-y-1.5 text-sm">
                {tocItems.map((item, idx) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="group flex items-start gap-2 rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-50"
                    >
                      <span className="mt-[1px] w-6 shrink-0 text-xs font-medium text-slate-400 group-hover:text-slate-600">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-5 group-hover:text-slate-900">{item.label}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <AuthorBioBox author={author} />
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Evidence &amp; Sources</p>
            <div className="mt-2 space-y-1">
              <p>Primary source: {sourceUrl ? <a href={sourceUrl} className="underline break-all" target="_blank" rel="noreferrer noopener">{sourceUrl}</a> : "Not available"}</p>
              <p>Updated at: {updatedAtLabel || "N/A"}</p>
              <p>Data window: {dataWindowLabel}</p>
              {dataPackUsed && (
                <p>
                  Evidence stats: {dataPackUsed.metricsAvailable || 0} metrics, {dataPackUsed.timelinePoints || 0} timeline points.
                </p>
              )}
            </div>
          </div>

          {shouldRenderFaqQuickView && (
            <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-slate-900">FAQ (Quick View)</h2>
              <div className="mt-3 space-y-2">
                {faqItems.map((item, idx) => (
                  <details key={`${idx}-${item.question}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer font-medium text-slate-900">{item.question}</summary>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
            <p>
              <strong>Disclaimer:</strong> The information provided is not trading advice, <a href="https://coinmarketbuzz.com" className="underline">coinmarketbuzz.com</a> holds no liability for any investments made based on the information provided on this page. We strongly recommend independent research and/or consultation with a qualified professional before making any investment decisions. <br></br>
              All published reports are reviewed by our editorial team for factual consistency, neutrality, and reader clarity.
            </p>
          </div>

          {relatedForMain.length > 0 && <RelatedArticlesSection articles={relatedForMain} />}
        </main>

        <div className="hidden h-full w-px bg-slate-200 lg:block" />

        <aside className="mt-8 min-w-0 w-full lg:sticky lg:top-24 lg:mt-0 lg:w-[320px]">
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

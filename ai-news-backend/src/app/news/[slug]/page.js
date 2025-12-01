import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CryptoSidebar from './CryptoSidebar';

// 1. Fetch Data Function
async function getArticle(slug) {
  // Use local API during dev, or full URL in prod
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/articles/${slug}`, {
      // Revalidate every 60s: good for Google News + freshness
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;
    return await res.json(); // expected: { article, relatedArticles }
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

// 2. SEO Metadata
export async function generateMetadata({ params }) {
  // match your original pattern – await params in Next 15+/16
  const { slug } = await params;
  const data = await getArticle(slug);

  if (!data?.article) {
    return { title: 'Article Not Found' };
  }

  const { article } = data;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
      type: 'article',
      images: [image],
      siteName: 'Crypto AI News',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.headline,
      description: article.metaDescription || article.excerpt || article.headline,
      images: [image],
    },
  };
}

// 3. The Page Component
export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const data = await getArticle(slug);

  if (!data || !data.article) {
    notFound();
  }

  const { article, relatedArticles } = data;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const articleUrl = `${baseUrl}/news/${article.slug}`;

  const date = new Date(article.createdAt).toLocaleDateString('en-US', {
    dateStyle: 'long',
  });

  // JSON-LD for Google News / rich results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.headline,
    description: article.metaDescription || article.excerpt || article.headline,
    image: article.imageUrl ? [article.imageUrl] : [],
    datePublished: article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    author: [
      {
        '@type': 'Organization',
        name: 'AI News Desk',
      },
    ],
    publisher: {
      '@type': 'Organization',
      name: 'Crypto AI News',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6 xl:px-0">
      {/* JSON-LD for Google / Google News */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumbs for UX + SEO */}
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

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        {/* Main Article Column */}
        <main
          className="flex-1"
          itemScope
          itemType="https://schema.org/NewsArticle"
        >
          {/* Top meta area – NO card container, more “editorial” look */}
          <header className="mb-6 border-b border-slate-200 pb-5">
            {/* Category / Tags row */}
            <div className="mb-3 flex flex-wrap gap-2">
              {article.tags &&
                article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-700"
                  >
                    {tag}
                  </span>
                ))}
            </div>

            {/* Headline */}
            <h1
              itemProp="headline"
              className="mb-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl"
            >
              {article.headline}
            </h1>

            {/* Dek / short summary */}
            {article.excerpt && (
              <p className="mb-4 max-w-3xl text-sm text-slate-600 sm:text-base">
                {article.excerpt}
              </p>
            )}

            {/* Author + date + meta */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:text-sm">
              <span
                itemProp="author"
                itemScope
                itemType="https://schema.org/Organization"
              >
                By{' '}
                <span itemProp="name" className="font-medium text-slate-800">
                  AI News Desk
                </span>
              </span>
              <span aria-hidden="true">•</span>
              <time
                itemProp="datePublished"
                dateTime={article.createdAt}
                className="font-medium text-slate-700"
              >
                {date}
              </time>
              {article.readingTime && (
                <>
                  <span aria-hidden="true">•</span>
                  <span>{article.readingTime} min read</span>
                </>
              )}
            </div>
          </header>

          {/* Hero image full-width, separated from meta */}
          {article.imageUrl && (
            <figure className="mb-8 overflow-hidden rounded-3xl bg-slate-100">
              <div className="relative h-56 w-full sm:h-80 lg:h-[420px]">
                <Image
                  src={article.imageUrl}
                  alt={article.headline}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 720px"
                />
              </div>
              {/* Optional caption if you ever add it on article */}
              {article.imageCaption && (
                <figcaption className="px-3 py-3 text-xs text-slate-500 sm:px-0">
                  {article.imageCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Article body – tuned for spacing & readability */}
          <section
            itemProp="articleBody"
            className="
              prose prose-slate max-w-none
              prose-headings:scroll-mt-24 prose-headings:font-semibold
              prose-a:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-700
              prose-img:rounded-2xl prose-img:shadow-sm
              prose-p:my-5 prose-li:my-1.5
              leading-relaxed
            "
            dangerouslySetInnerHTML={{ __html: article.articleHtml }}
          />

          {/* Related stories at the bottom */}
          {relatedArticles && relatedArticles.length > 0 && (
            <section className="mt-10 border-t border-slate-200 pt-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Related stories
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/news/${related.slug}`}
                    className="group block rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60"
                  >
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-blue-800">
                      {related.headline}
                    </h3>
                    {related.createdAt && (
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(related.createdAt).toLocaleDateString(
                          'en-US',
                          { dateStyle: 'medium' }
                        )}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* Right Sidebar: visually lighter, mobile-first (stacks below on small screens) */}
        <aside className="w-full shrink-0 lg:w-80 lg:sticky lg:top-20 lg:self-start">
          <div className="mt-8 border-t border-slate-200 pt-6 lg:mt-0 lg:border-none lg:pt-0">
            <CryptoSidebar />
          </div>
        </aside>
      </div>
    </div>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// 1. Fetch Data Function
async function getArticle(slug) {
  // Use local API during dev, or full URL in prod
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  try {
    const res = await fetch(`${baseUrl}/api/articles/${slug}`, {
      next: { revalidate: 60 }
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
  // Await params in Next.js 15+
  const { slug } = await params;
  const data = await getArticle(slug);
  
  if (!data?.article) return { title: 'Article Not Found' };

  return {
    title: data.article.headline,
    description: data.article.metaDescription,
    openGraph: {
      images: [data.article.imageUrl || ''],
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
  const date = new Date(article.createdAt).toLocaleDateString('en-US', {
    dateStyle: 'long',
  });

  return (
    <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Hero Image */}
      {article.imageUrl && (
        <div className="relative h-64 w-full sm:h-96 bg-slate-100">
          <Image 
            src={article.imageUrl} 
            alt={article.headline} 
            fill 
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 800px, 1200px"
          />
        </div>
      )}

      <div className="p-6 sm:px-10 sm:py-8">
        {/* Header */}
        <div className="mb-8 border-b border-slate-100 pb-8">
          <div className="mb-4 flex gap-2">
            {article.tags && article.tags.map(tag => (
              <span key={tag} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
            {article.headline}
          </h1>
          <div className="flex items-center text-sm text-slate-500">
            <span>By AI News Desk</span>
            <span className="mx-2">•</span>
            <time>{date}</time>
          </div>
        </div>

        {/* Content Injection */}
        <div 
          className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-xl prose-img:shadow-sm"
          dangerouslySetInnerHTML={{ __html: article.articleHtml }}
        />

        {/* Related News */}
        {relatedArticles && relatedArticles.length > 0 && (
          <div className="mt-12 border-t border-slate-200 pt-8">
            <h3 className="mb-4 text-xl font-bold text-slate-900">Related Stories</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedArticles.map(related => (
                <Link key={related.id} href={`/news/${related.slug}`} className="block rounded-lg border border-slate-100 p-4 transition hover:border-blue-200 hover:bg-blue-50">
                  <h4 className="line-clamp-2 font-semibold text-slate-800">{related.headline}</h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
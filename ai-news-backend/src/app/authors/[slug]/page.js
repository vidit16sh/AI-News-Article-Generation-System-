// src/app/authors/[slug]/page.js
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import RightSidebar from "../../../components/layout/RightSidebar";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getAuthorWithArticles(slug) {
  if (!slug) return null;

  try {
    return await prisma.author.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        role: true,
        imageUrl: true,
        bio: true, 
        linkedin: true, 
        expertise: true,
        articles: {
          where: { status: "PUBLISHED" },
          orderBy: { publishAt: "desc" },
          take: 50,
          select: {
            id: true,
            slug: true,
            headline: true,
            metaDescription: true,
            imageUrl: true,
            publishAt: true,
            tags: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching author data:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const author = await getAuthorWithArticles(slug);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com";

  if (!author) return { title: "Author Not Found | CoinMarketBuzz" };

  return {
    title: `${author.name} | Author at CoinMarketBuzz`,
    description: author.bio || `Read the latest crypto analysis by ${author.name}.`,
    alternates: { canonical: `${baseUrl}/authors/${author.slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function AuthorPage({ params }) {
  const { slug } = await params;
  const author = await getAuthorWithArticles(slug);

  if (!author) notFound();
   
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com"; 
  
  const name = author.name || "Editorial Team";
  const role = author.role || "Contributor";
  // Fallback if image is missing
  const imageUrl = (author.imageUrl && author.imageUrl.startsWith('/')) 
    ? author.imageUrl 
    : "/default-news.jpg";

  const bio = author.bio || "Crypto market analyst and contributor.";
  const articles = author.articles || []; 
  
  const authorJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": name,
  "jobTitle": role,
  "url": `${baseUrl}/authors/${author.slug}`,
  "image": imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`,
  "description": bio,
  // ✅ ESSENTIAL: Link to their verified LinkedIn and the author page itself
  "sameAs": [
    author.linkedin,
    `${baseUrl}/authors/${author.slug}`
  ].filter(Boolean),
  "worksFor": {
    "@type": "Organization",
    "name": "CoinMarketBuzz",
    "url": baseUrl,
    "logo": `${baseUrl}/brand/logo.png`
  },
  // ✅ E-E-A-T SIGNAL: List their specific expertise areas
  "knowsAbout": author.expertise || [
    "Blockchain Technology", 
    "Cryptocurrency Markets", 
    "Financial Analysis"
  ],
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `${baseUrl}/authors/${author.slug}`
  }
};
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-0"> 
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorJsonLd) }}
      />
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 text-xs font-medium text-slate-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/" className="hover:text-slate-800 transition-colors">Home</Link></li>
          <li>/</li>
          {/* If you don't have an /authors list page, you can remove this middle link */}
          <li><Link href="/authors" className="hover:text-slate-800 transition-colors">Authors</Link></li>
          <li>/</li>
          <li className="text-slate-700" aria-current="page">{name}</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,1fr)] lg:items-start lg:gap-12">
        {/* MAIN CONTENT */}
        <main className="lg:pr-0">
          
          {/* Author Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="relative h-24 w-24 flex-none overflow-hidden rounded-full bg-slate-100 border border-slate-100">
                <Image
                  src={imageUrl}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="96px"
                  priority
                />
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{name}</h1>
                <div className="mt-1 flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {role}
                  </span> 
                  {author.expertise?.map((exp) => (
                    <span key={exp} className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-slate-500 border border-slate-100">
                      {exp}
                    </span>
                  ))}
                </div>
                
                <div className="mt-4 text-base leading-relaxed text-slate-600 max-w-2xl">
                  {bio}
                </div>

                {/* ✅ Only LinkedIn shown */}
                {author.linkedin && (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <a
                      href={author.linkedin}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      Connect on LinkedIn
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Articles Feed */}
          <section className="mt-12">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Recent Analysis</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {articles.length}
              </span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="group flex flex-col rounded-xl border border-slate-200 bg-white p-1 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-slate-100">
                    {article.imageUrl ? (
                      <Image
                        src={article.imageUrl}
                        alt={article.headline}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 300px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-2 text-xs font-medium text-slate-500 flex items-center gap-2">
                        <span className="uppercase tracking-wider text-blue-700">
                            {(article.tags?.[0] || "News").toString()}
                        </span>
                        <span>•</span>
                        <span>
                            {article.publishAt 
                            ? new Date(article.publishAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : ""}
                        </span>
                    </div>
                    <h3 className="line-clamp-2 text-lg font-bold text-slate-900 group-hover:text-blue-700">
                      {article.headline}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                      {article.metaDescription}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            
            {articles.length === 0 && (
              <p className="text-slate-500 italic">No articles published yet.</p>
            )}
          </section>
        </main>

        <div className="hidden h-full w-px bg-slate-200 lg:block" />
        <aside className="mt-8 w-full lg:sticky lg:top-24 lg:mt-0 lg:pl-4">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}

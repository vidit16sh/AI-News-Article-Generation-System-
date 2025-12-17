// src/app/authors/page.js
import Image from "next/image";
import Link from "next/link";
import RightSidebar from "../../components/layout/RightSidebar";
import { EDITORIAL_TEAM } from "../../config/authors";

export const metadata = {
  title: "Editorial Team | CoinMarketBuzz",
  description: "Meet the analysts and journalists behind CoinMarketBuzz's crypto market coverage.",
};

export default function AuthorsIndexPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-0">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 text-xs font-medium text-slate-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/" className="hover:text-slate-800 transition-colors">Home</Link></li>
          <li>/</li>
          <li className="text-slate-700" aria-current="page">Authors</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,1fr)] lg:items-start lg:gap-12">
        <main className="lg:pr-0">
          <header className="mb-10 border-b border-slate-200 pb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Editorial Team
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl">
              Our team of analysts combines algorithmic data with human expertise to bring you factual, noise-free crypto market intelligence.
            </p>
          </header>

          <div className="grid gap-8 sm:grid-cols-2">
            {EDITORIAL_TEAM.map((author) => (
              <Link 
                key={author.slug} 
                href={`/authors/${author.slug}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative h-16 w-16 flex-none overflow-hidden rounded-full bg-slate-100">
                    {author.imageUrl ? (
                      <Image
                        src={author.imageUrl}
                        alt={author.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-400">
                        {author.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {author.name}
                    </h3>
                    <p className="text-sm font-medium text-slate-500">{author.role}</p>
                  </div>
                </div>
                
                <p className="text-sm leading-relaxed text-slate-600 mb-4 line-clamp-3">
                  {author.bio}
                </p>

                <div className="mt-auto flex items-center text-sm font-semibold text-blue-700">
                  Read Analysis <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        </main>

        <div className="hidden h-full w-px bg-slate-200 lg:block" />
        <aside className="mt-8 w-full lg:sticky lg:top-24 lg:mt-0 lg:pl-4">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
// src/app/authors/[slug]/page.js
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import RightSidebar from "../../../components/layout/RightSidebar";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getAuthorWithArticles(slug) {
  if (!slug) return null;

  return prisma.author.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      role: true,
      imageUrl: true,

      // ✅ Persona / Bio fields (use whichever exists in your DB)
      bio: true,
      bioText: true,
      personaBio: true,
      about: true,
      description: true,
      summary: true,

      // Optional socials if you have them
      twitterUrl: true,
      linkedinUrl: true,
      websiteUrl: true,

      articles: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          slug: true,
          headline: true,
          metaDescription: true,
          imageUrl: true,
          createdAt: true,
          tags: true,
        },
      },
    },
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const author = await getAuthorWithArticles(slug);

  if (!author) return { title: "Author Not Found | VrajNews" };

  const bio =
    author.personaBio ||
    author.bio ||
    author.bioText ||
    author.about ||
    author.description ||
    author.summary ||
    "";

  return {
    title: `${author.name} | Author at VrajNews`,
    description:
      bio ||
      `${author.name} publishes AI-assisted crypto & tech explainers with editorial oversight.`,
  };
}

export default async function AuthorPage({ params }) {
  const { slug } = await params;
  const author = await getAuthorWithArticles(slug);

  if (!author) notFound();

  const name = author.name || "Editorial Team";
  const role = author.role || "Contributor";
  const imageUrl = author.imageUrl || null;

  // ✅ This is what Google wants to see clearly on-page
  const personaBio =
    author.personaBio ||
    author.bio ||
    author.bioText ||
    author.about ||
    author.description ||
    author.summary ||
    "";

  const articles = Array.isArray(author.articles) ? author.articles : [];

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
              href="/authors"
              className="hover:text-slate-800 transition-colors"
            >
              Authors
            </Link>
          </li>
          <li>/</li>
          <li className="text-slate-700" aria-current="page">
            {name}
          </li>
        </ol>
      </nav>

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,1fr)] lg:items-start lg:gap-12">
        {/* MAIN */}
        <main className="lg:pr-0">
          {/* Author Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={name}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-extrabold text-slate-500">
                    {name.charAt(0)}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {name}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{role}</p>

                {/* ✅ Persona Bio (important for “Human Reviewer” / E-E-A-T) */}
                {personaBio && (
                  <div className="mt-4 text-sm leading-relaxed text-slate-700">
                    {personaBio}
                  </div>
                )}

                {/* Optional: social links if present */}
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  {author.websiteUrl && (
                    <a
                      href={author.websiteUrl}
                      className="font-semibold text-blue-700 hover:underline"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Website
                    </a>
                  )}
                  {author.twitterUrl && (
                    <a
                      href={author.twitterUrl}
                      className="font-semibold text-blue-700 hover:underline"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      X (Twitter)
                    </a>
                  )}
                  {author.linkedinUrl && (
                    <a
                      href={author.linkedinUrl}
                      className="font-semibold text-blue-700 hover:underline"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Articles list */}
          <section className="mt-10">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-6 w-1.5 rounded-full bg-red-600" />
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Latest articles by {name}
              </h2>
            </div>

            {articles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No published articles yet.
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {articles.map((a) => (
                  <Link
                    key={a.id || a.slug}
                    href={`/news/${a.slug}`}
                    className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <div className="text-xs text-slate-500">
                      {(a.tags?.[0] || "News").toString()} •{" "}
                      {a.createdAt
                        ? new Date(a.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : ""}
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {a.headline}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {a.metaDescription || ""}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>

        <div className="hidden h-full w-px bg-slate-200 lg:block" />

        {/* SIDEBAR */}
        <aside className="mt-8 w-full lg:sticky lg:top-24 lg:mt-0 lg:pl-4">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}

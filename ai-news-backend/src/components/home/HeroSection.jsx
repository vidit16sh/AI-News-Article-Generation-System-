import Link from "next/link";
import Image from "next/image";

export default function HeroSection({ featured }) {
  const fallback = {
    slug: "getting-started-with-vrajnews",
    category: "Business",
    title:
      "Small Businesses Flourish as US Government Expands Loan Access and Support",
    excerpt:
      "In a year filled with economic challenges, small businesses across the United States are finding new opportunities for growth and expansion, thanks to the U.S....",
    author: "AI Writer",
    date: "",
    imageUrl: "",
  };

  const article = featured ? normalizeArticle(featured, fallback) : fallback;

  return (
    <section className="mt-4 mb-6">
      {/* NOTE:
         - Mobile & tablet: single column
         - Laptop+: two columns (same look as before) */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1.6fr] lg:items-stretch">
        {/* Image column */}
        <div className="order-1 lg:order-2 relative h-[260px] w-full overflow-hidden rounded-lg bg-slate-100 sm:h-[340px] md:h-[340px] lg:h-[400px] lg:w-[600px]">
          {article.imageUrl ? (
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              priority // critical for LCP
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <span className="text-6xl">📰</span>
            </div>
          )}
        </div>

        {/* Text column */}
        <div className="order-2 lg:order-1 flex flex-col justify-start gap-4 px-1 md:px-0">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-[0.8rem]">
              <span className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-[0.8rem] font-normal text-red-600">
                {article.category}
              </span>
              {article.date && (
                <span className="text-[0.8rem] font-light text-slate-500">
                  {article.date}
                </span>
              )}
            </div>

            <h1 className="text-2xl leading-snug sm:text-3xl lg:text-[2rem]">
              <Link
                href={`/news/${article.slug}`}
                className="underline-offset-[3px] decoration-red-500 hover:underline"
              >
                {article.title}
              </Link>
            </h1>

            <p className="max-w-xl text-[1rem] leading-relaxed text-[#020a1c]">
              {article.excerpt}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function normalizeArticle(article, fallback) {
  const slug = article.slug || article.id || fallback.slug;
  const title = article.headline || article.title || fallback.title;
  const excerpt =
    article.metaDescription ||
    article.summary ||
    article.excerpt ||
    fallback.excerpt;
  const category =
    article.category ||
    article.primaryCategory ||
    article.tags?.[0] ||
    fallback.category;
  const author = article.authorName || article.sourceName || fallback.author;
  const imageUrl =
    article.imageUrl ||
    article.heroImageUrl ||
    article.thumbnail ||
    fallback.imageUrl;

  return {
    slug,
    title,
    excerpt,
    category,
    author,
    date: formatDisplayDate(article.createdAt) || fallback.date,
    timeAgo: timeAgoFromDate(article.createdAt),
    imageUrl,
  };
}

function formatDisplayDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function timeAgoFromDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

import Link from "next/link";
import Image from "next/image";

export default function PoliticsStripSection({ articles }) {
  const list = Array.isArray(articles) ? articles.map(normalizeArticle) : [];
  const sliced = list.slice(0, 4);

  if (!sliced.length) return null;

  return (
    // Full-width strip inside main content container
    <section className="rounded-3xl bg-[#f7fafc] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-[16px] w-[6px] bg-red-500 rounded-[2px]" />
          <h2 className="text-[1rem] sm:text-[1.1rem] font-light text-slate-800">
            Politics
          </h2>
        </div>

        <Link
          href="/category/politics"
          className="flex items-center gap-1 text-[0.9rem] font-light text-red-600 hover:text-red-700"
        >
          View all <span className="text-red-600 text-sm">→</span>
        </Link>
      </div>

      {/* Cards – 1 column on mobile, 4 in a row on md+ */}
      <div className="grid gap-5 md:grid-cols-4">
        {sliced.map((a) => (
          <Link
            key={a.slug}
            href={`/news/${a.slug}`}
            className="group flex h-full flex-row items-center gap-3 rounded-2xl p-2 transition hover:bg-white/80"
          >
            {/* Image on the left */}
            <div className="relative h-24 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-32">
              {a.imageUrl ? (
                <Image
                  src={a.imageUrl}
                  alt={a.fullTitle}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 35vw, 20vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <span className="text-2xl">🏛️</span>
                </div>
              )}
            </div>

            {/* Text on the right */}
            <div className="flex flex-1 flex-col justify-center gap-1">
              <div className="text-[0.75rem] font-light text-slate-500">
                {a.date && `${a.date} • `}
                <span>{a.category}</span>
              </div>
              <h3 className="text-[0.9rem] sm:text-[0.95rem] font-light text-slate-900 leading-snug group-hover:underline underline-offset-[3px]">
                {a.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function normalizeArticle(article) {
  const slug = article.slug || article.id || "#";
  const rawTitle = article.headline || article.title || "Untitled article";
  const title = truncateText(rawTitle, 80); // limit characters and add "..."
  const category =
    article.category ||
    article.primaryCategory ||
    article.tags?.[0] ||
    "Politics";
  const imageUrl =
    article.imageUrl || article.heroImageUrl || article.thumbnail || "";

  return {
    slug,
    title,          // truncated title for display
    fullTitle: rawTitle, // keep full title if you ever need it (tooltip, etc.)
    category,
    imageUrl,
    date: formatDisplayDate(article.createdAt),
  };
}

function truncateText(text, maxChars) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + "...";
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

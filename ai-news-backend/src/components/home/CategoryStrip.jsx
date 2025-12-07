"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const CATEGORIES = [
  { slug: "all", label: "All" },
  // Crypto
  { slug: "bitcoin", label: "Bitcoin" },
  { slug: "ethereum", label: "Ethereum" },
  { slug: "defi", label: "DeFi" },
  { slug: "crypto-regulation", label: "Regulation" },
  // AI
  { slug: "generative-ai", label: "Gen AI" },
  { slug: "ai-hardware", label: "AI Chips" },
  { slug: "robotics", label: "Robotics" },
  // Finance/Forex
  { slug: "forex", label: "Forex" },
  { slug: "central-banks", label: "Fed & Rates" },
  { slug: "commodities", label: "Gold & Oil" },
];
export default function CategoryStrip() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFromQuery = searchParams.get("category") || "all";

  const isHome = pathname === "/";

  return (
    <section className="mb-5 mt-1">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Browse by category
        </h2>
        <span className="hidden text-[0.7rem] text-slate-400 sm:inline">
          Tap a tag to filter articles
        </span>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 pt-1 text-sm thin-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive =
            isHome && cat.slug === activeFromQuery
              ? true
              : isHome && cat.slug === "all" && !searchParams.get("category");

          const href =
            cat.slug === "all" ? "/" : `/?category=${encodeURIComponent(cat.slug)}`;

          return (
            <Link
              key={cat.slug}
              href={href}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 transition ${
                isActive
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="text-xs">
                {iconForCategory(cat.slug)}
              </span>
              <span className="text-xs sm:text-[0.8rem] font-medium">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function iconForCategory(slug) {
  switch (slug) {
    // Crypto
    case "bitcoin": return "🟠";
    case "ethereum": return "🔹";
    case "defi": return "🦄";
    case "crypto-regulation": return "⚖️";
    case "altcoins": return "🚀";
    // AI
    case "generative-ai": return "✨";
    case "ai-hardware": return "💾";
    case "robotics": return "🤖";
    // Forex
    case "forex": return "💱";
    case "central-banks": return "🏦";
    case "commodities": return "🛢️";
    default: return "📰";
  }
}

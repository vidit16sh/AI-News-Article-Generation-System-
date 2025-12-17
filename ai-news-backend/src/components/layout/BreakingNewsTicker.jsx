"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function BreakingNewsTicker() {
  const [item, setItem] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/breaking", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setItem(data?.article || null);
      } catch {
        if (!cancelled) setItem(null);
      }
    }

    load();
    const t = setInterval(load, 60_000); // refresh every 60s
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!item?.headline || !item?.slug) return null;

  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
        Breaking
      </span>

      <div className="relative w-full overflow-hidden">
        <div className="animate-[ticker_18s_linear_infinite] whitespace-nowrap">
          <Link
            href={`/news/${item.slug}`}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            {item.headline}
          </Link>
          <span className="mx-8 text-slate-300">•</span>
          <Link
            href={`/news/${item.slug}`}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            {item.headline}
          </Link>
        </div>
      </div>
    </div>
  );
}

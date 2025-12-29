export const metadata = {
  title: "Careers | CoinMarketBuzz",
  description:
    "Careers at CoinMarketBuzz. Join our newsroom, product, and growth teams. This page is coming soon.",
};

export default function CareersPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-20">
      <div className="flex flex-col items-center justify-center text-center">
        {/* Badge */}
        <span className="mb-4 inline-block rounded-full border border-red-600/40 bg-red-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-red-500">
          Coming Soon
        </span>

        {/* Heading */}
        <h1 className="mb-4 text-3xl font-semibold text-slate-600 sm:text-4xl">
          Careers at CoinMarketBuzz
        </h1>

        {/* Description */}
        <p className="max-w-xl text-[0.95rem] leading-relaxed text-slate-400">
          We’re preparing a dedicated careers page with opportunities across
          editorial, research, engineering, and growth. If you’re passionate
          about crypto, finance, AI, and storytelling, we’d love to hear from
          you.
        </p>

        {/* Sub text */}
        <p className="mt-4 text-sm text-slate-500">
          For early interest or collaborations, email us at{" "}
          <a
            href="mailto:careers@coinmarketbuzz.com"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            careers@coinmarketbuzz.com
          </a>
        </p>
      </div>
    </main>
  );
}

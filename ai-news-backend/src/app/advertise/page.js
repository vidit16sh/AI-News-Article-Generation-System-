export const metadata = {
  title: "Advertise With Us | CoinMarketBuzz",
  description:
    "Advertising opportunities on CoinMarketBuzz. This page is coming soon.",
};

export default function AdvertisePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-20">
      <div className="flex flex-col items-center justify-center text-center">
        {/* Badge */}
        <span className="mb-4 inline-block rounded-full border border-red-600/40 bg-red-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-red-500">
          Coming Soon
        </span>

        {/* Heading */}
        <h1 className="mb-4 text-3xl font-semibold text-slate-600 sm:text-4xl">
          Advertise with CoinMarketBuzz
        </h1>

        {/* Description */}
        <p className="max-w-xl text-[0.95rem] leading-relaxed text-slate-400">
          We’re building a dedicated advertising and partnerships page to help
          brands reach a global audience interested in crypto, finance, AI, and
          technology.
        </p>

        {/* Sub text */}
        <p className="mt-4 text-sm text-slate-500">
          For early inquiries, please reach out at{" "}
          <a
            href="mailto:contact@coinmarketbuzz.com"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            contact@coinmarketbuzz.com
          </a>
        </p>
      </div>
    </main>
  );
}

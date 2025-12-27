// src/app/about/page.js

export const metadata = {
  title: "About Us - CoinMarketBuzz",
  description:
    "CoinMarketBuzz.com is an independent digital news media platform based in India, delivering timely and reliable coverage of cryptocurrency, blockchain, finance, technology, and global business trends.",
};

function SectionCard({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          <div className="mt-3 space-y-3 text-[15px] leading-7 text-slate-700">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function BulletList({ items }) {
  return (
    <ul className="mt-3 grid gap-2">
      {items.map((text) => (
        <li key={text} className="flex gap-3">
          <span className="mt-2 h-2 w-2 flex-none rounded-full bg-[#d00000]" />
          <span className="text-[15px] leading-7 text-slate-700">{text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  return (
    // Centering fix for mobile + consistent alignment:
    <div className="mx-auto w-full max-w-[980px] px-4 py-10 sm:py-14">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#d00000]" />

        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-[#d00000]" />
            About CoinMarketBuzz
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Independent crypto & finance journalism, built for clarity.
          </h1>

          <p className="mt-3 max-w-[70ch] text-[15px] leading-7 text-slate-700 sm:text-base">
            CoinMarketBuzz.com is an independent digital news media platform
            based in India, delivering timely and reliable coverage of
            cryptocurrency, blockchain, finance, technology, and global business
            trends.
          </p>
        </div>

        {/* Quick cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Mission
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              Reader-first journalism
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Accurate, transparent, and useful reporting.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Coverage
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              Crypto • Finance • Tech
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Market moves, explainers, and industry updates.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Trust
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              Clear separation
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Editorial and commercial operations stay separate.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8 grid gap-5">
        {/* ✅ Mission + What We Do in one row (like Audience + Compliance) */}
        <div className="grid gap-5 md:grid-cols-2">
          <SectionCard
            title="Our Mission"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            <p className="font-medium text-slate-800">Our mission is to provide:</p>
            <BulletList
              items={[
                "Accurate news",
                "Transparent reporting",
                "Reader-first journalism",
              ]}
            />
          </SectionCard>

          <SectionCard
            title="What We Do"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M4 12h16M4 18h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            }
          >
            <BulletList
              items={[
                "Cover breaking news and market developments",
                "Publish industry insights and explainers",
                "Share press releases and sponsored updates (clearly disclosed)",
              ]}
            />
          </SectionCard>
        </div>

        <SectionCard
          title="Editorial Transparency"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 17a4 4 0 100-8 4 4 0 000 8z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          }
        >
          <p>
            CoinMarketBuzz maintains a strict separation between editorial and
            commercial operations. Sponsored content is clearly labeled, and
            editorial integrity is never compromised.
          </p>
        </SectionCard>

        <div className="grid gap-5 md:grid-cols-2">
          <SectionCard
            title="Our Audience"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M16 11a4 4 0 10-8 0 4 4 0 008 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M4 22c1.5-4 5-6 8-6s6.5 2 8 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            }
          >
            <p className="font-medium text-slate-800">Our readers include:</p>
            <BulletList
              items={[
                "Crypto & tech enthusiasts",
                "Investors & professionals",
                "Founders, developers, and analysts",
                "General readers seeking credible information",
              ]}
            />
          </SectionCard>

          <SectionCard
            title="Compliance & Trust"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            <p className="font-medium text-slate-800">CoinMarketBuzz follows:</p>
            <BulletList
              items={[
                "Google News content policies",
                "Google AdSense program policies",
                "Indian IT and digital media regulations",
              ]}
            />
          </SectionCard>
        </div>

        {/* Contact */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                Contact Information
              </h2>
              <p className="mt-1 text-[15px] leading-7 text-slate-700">
                For inquiries, partnerships, or feedback, reach us here:
              </p>
            </div>

            <div className="mt-3 sm:mt-0">
              <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                Response times may vary
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a
              href="mailto:Contact@CoinmarketBuzz.com"
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center transition hover:bg-white sm:text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Email
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 group-hover:text-[#d00000]">
                contact@CoinmarketBuzz.com
              </p>
            </a>

            <a
              href="https://www.coinmarketbuzz.com"
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center transition hover:bg-white sm:text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Website
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 group-hover:text-[#d00000]">
                coinmarketbuzz.com
              </p>
            </a>

            {/* ✅ Added Phone */}
            <a
              href="tel:+910000000000"
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center transition hover:bg-white sm:text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Phone
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 group-hover:text-[#d00000]">
                +971 50 942 9651
              </p>
            </a>

            {/* ✅ Added Address */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Address
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                India
              </p>
              <p className="mt-1 text-sm text-slate-700">
                C-14, Giriraj Society, Ekta Nagar, New Sama,
                Vadodara, Gujarat 390002
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

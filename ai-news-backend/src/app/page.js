import HeroSection from "../components/home/HeroSection";
import LatestNewsSection from "../components/home/LatestNewsSection";
import TopStoriesSection from "../components/home/TopStoriesSection";
import PoliticsStripSection from "../components/home/PoliticsStripSection";
import RightSidebar from "../components/layout/RightSidebar";
import AutoRefresh from "../components/common/AutoRefresh";
import prisma from "@/lib/prisma";

// ✅ ISR: refresh the cached homepage at most every 60 seconds
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: "Latest Cryptocurrency News | CoinMarketBuzz",
  description:
    "Breaking cryptocurrency news, Bitcoin and Ethereum market updates, regulation coverage, and data-backed analysis from the CoinMarketBuzz editorial desk.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://coinmarketbuzz.com/",
    title: "CoinMarketBuzz | Latest Cryptocurrency News",
    description:
      "Breaking cryptocurrency news, Bitcoin and Ethereum market updates, and editorial analysis.",
    images: ["/brand/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CoinMarketBuzz | Latest Cryptocurrency News",
    description:
      "Breaking cryptocurrency news, Bitcoin and Ethereum market updates, and editorial analysis.",
    images: ["/brand/logo.png"],
  },
};

export default async function HomePage() {
  // ✅ 1. Direct Database Query
  const articlesRaw = await prisma.generatedArticle.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishAt: "desc" },
    take: 20,
    include: {
      author: true,
      originalNews: {
        include: {
          category: true,
        },
      },
    },
  });

  // ✅ 2. Data Mapping
  const articles = articlesRaw.map((art) => ({
    ...art,
    category: art.originalNews?.category?.name || "General",
    authorName: art.author?.name || "CoinMarketBuzz Writer",
  }));

  // Separate the "Featured" (first one) from the rest
  const [featured, ...rest] = articles;

  const latestNews = rest.slice(0, 3);
  const topStoriesMain = rest[3] || featured || rest[0];
  const topStoriesList = rest.slice(4, 8);
  const politicsArticles = rest.slice(8, 12);

  const politicsSource = politicsArticles.length ? politicsArticles : rest;
  const politicsForStrip = politicsSource.slice(0, 4);
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CoinMarketBuzz",
    url: "https://coinmarketbuzz.com",
    logo: "https://coinmarketbuzz.com/brand/logo.png",
    sameAs: [
      "https://x.com/coinmarketbuzz",
      "https://www.linkedin.com/company/coinmarketbuzz",
    ],
  };
  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CoinMarketBuzz",
    url: "https://coinmarketbuzz.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://coinmarketbuzz.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="space-y-10">
      <h1 className="sr-only">Latest Cryptocurrency News</h1>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
      {/* ✅ Auto refresh while the page is OPEN */}
      <AutoRefresh intervalMs={60000} />

      <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,1fr)] lg:gap-0">
        <div className="space-y-6 lg:pr-8">
          <HeroSection featured={featured || rest[0]} />
          <LatestNewsSection
            articles={latestNews.length ? latestNews : rest.slice(0, 3)}
          />
          <TopStoriesSection
            mainArticle={topStoriesMain}
            listArticles={topStoriesList.length ? topStoriesList : rest.slice(0, 4)}
          />
        </div>

        <div className="hidden lg:block bg-slate-200" />

        <aside className="mt-8 space-y-6 lg:mt-0 lg:pl-8">
          <RightSidebar />
        </aside>
      </div>

      <PoliticsStripSection articles={politicsForStrip} />
    </div>
  );
}

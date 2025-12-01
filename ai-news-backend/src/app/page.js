import HeroSection from "../components/home/HeroSection";
import LatestNewsSection from "../components/home/LatestNewsSection";
import TopStoriesSection from "../components/home/TopStoriesSection";
import SidebarFinanceSection from "../components/home/SidebarFinanceSection";
import PoliticsStripSection from "../components/home/PoliticsStripSection";

async function fetchLatestArticles() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/articles/latest`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error("Failed to fetch latest articles:", res.status);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error fetching latest articles:", err);
    return [];
  }
}

export default async function HomePage(props) {
  const allArticles = await fetchLatestArticles();

  const searchParams = props?.searchParams || {};
  const rawCategory = searchParams.category;

  const categorySlug = Array.isArray(rawCategory)
    ? rawCategory[0]
    : rawCategory || "all";

  let filteredArticles = allArticles;

  if (categorySlug && categorySlug !== "all") {
    const slugLower = categorySlug.toLowerCase();
    filteredArticles = allArticles.filter((article) => {
      const category =
        article.category ||
        article.primaryCategory ||
        article.tags?.[0] ||
        "";
      return category.toLowerCase().includes(slugLower);
    });
  }

  const [featured, ...rest] = filteredArticles;

  const latestNews = rest.slice(0, 3);
  const topStoriesMain = rest[3] || featured || rest[0];
  const topStoriesList = rest.slice(4, 8);
  const politicsArticles = rest.slice(8, 12);
  const financeArticles = rest.slice(3, 10).length
    ? rest.slice(3, 10)
    : rest.slice(0, 7);

  const politicsSource = politicsArticles.length ? politicsArticles : rest;
  const politicsForStrip = politicsSource.slice(0, 4);

  return (
    <div className="space-y-10">
      {/* TOP: hero + latest + top stories + finance sidebar with divider */}
      <div className="lg:grid lg:grid-cols-[minmax(0,2.4fr)_1px_minmax(0,1fr)] lg:gap-0">
        {/* LEFT SIDE */}
        <div className="space-y-6 lg:pr-8">
          <HeroSection featured={featured || rest[0]} />

          <LatestNewsSection
            articles={latestNews.length ? latestNews : rest.slice(0, 3)}
          />

          <TopStoriesSection
            mainArticle={topStoriesMain}
            listArticles={
              topStoriesList.length ? topStoriesList : rest.slice(0, 4)
            }
          />
        </div>

        {/* VERTICAL DIVIDER – height = whole grid row */}
        <div className="hidden lg:block bg-slate-200" />

        {/* RIGHT SIDE */}
        <aside className="mt-8 space-y-6 lg:mt-0 lg:pl-8">
          <SidebarFinanceSection
            articles={
              financeArticles.length ? financeArticles : rest.slice(0, 7)
            }
          />
        </aside>
      </div>

      {/* FULL-WIDTH POLITICS STRIP (separate from grid so divider stops above it) */}
      <PoliticsStripSection articles={politicsForStrip} />
    </div>
  );
}

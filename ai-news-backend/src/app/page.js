import HeroSection from "../components/home/HeroSection";
import LatestNewsSection from "../components/home/LatestNewsSection";
import TopStoriesSection from "../components/home/TopStoriesSection";
import PoliticsStripSection from "../components/home/PoliticsStripSection";
import RightSidebar from "../components/layout/RightSidebar";
import prisma from "@/lib/prisma";
export const dynamic = 'force-dynamic';  

export default async function HomePage() {
  // ✅ 1. Direct Database Query with CORRECT nesting
  const articlesRaw = await prisma.generatedArticle.findMany({
    where: {
      status: "PUBLISHED",
    },
    orderBy: {
      publishAt: "desc",
    },
    take: 20,
    include: {
      author: true, 
      originalNews: {
        include: {
          category: true, // Category lives inside originalNews
        },
      },
    },
  });

  // ✅ 2. Data Mapping
  // We flatten the data so 'article.category' is easy for components to read
 const articles = articlesRaw.map((art) => ({
    ...art,
    // Extract the category name string or use "General" as a fallback
    category: art.originalNews?.category?.name || "General", 
    // Do the same for author to avoid future object errors
    authorName: art.author?.name || "AI Writer",
 })); 
  
  // Separate the "Featured" (first one) from the rest
  const [featured, ...rest] = articles;

  const latestNews = rest.slice(0, 3);
  const topStoriesMain = rest[3] || featured || rest[0];
  const topStoriesList = rest.slice(4, 8);
  const politicsArticles = rest.slice(8, 12);

  const politicsSource = politicsArticles.length ? politicsArticles : rest;
  const politicsForStrip = politicsSource.slice(0, 4);

  return (
    <div className="space-y-10">
      <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,1fr)] lg:gap-0">
        <div className="space-y-6 lg:pr-8">
          <HeroSection featured={featured || rest[0]} />
          <LatestNewsSection articles={latestNews.length ? latestNews : rest.slice(0, 3)} />
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
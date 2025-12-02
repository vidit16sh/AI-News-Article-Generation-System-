import HeroSection from "../components/home/HeroSection.jsx";
import CategoryStrip from "../components/home/CategoryStrip.jsx";
import ArticleGrid from "../components/home/ArticleGrid.jsx";

async function fetchLatestArticles() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    // ✅ Call the new Super API (limit 20 for homepage)
    const res = await fetch(`${baseUrl}/api/articles?limit=20`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];
    
    const json = await res.json();
    // ✅ Handle the new response structure ({ data: [...] })
    return json.data || []; 
  } catch (err) {
    console.error("Error fetching articles:", err);
    return [];
  }
}

export default async function HomePage() {
  const articles = await fetchLatestArticles();

  // Separate the "Featured" (first one) from the rest
  const [featured, ...rest] = articles;

  return (
    <div className="space-y-6 sm:space-y-8">
      <HeroSection featured={featured} />
      <CategoryStrip />
      <ArticleGrid articles={rest} />
    </div>
  );
}
import HeroSection from "../components/home/HeroSection.jsx";
import CategoryStrip from "../components/home/CategoryStrip.jsx";
import ArticleGrid from "../components/home/ArticleGrid.jsx";

async function fetchLatestArticles() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/articles/latest`, {
      // Revalidate every 60s so homepage stays fresh
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

export default async function HomePage({ searchParams }) {
  const allArticles = await fetchLatestArticles();

  const categorySlug = searchParams?.category || "all";

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

  return (
    <div className="space-y-6 sm:space-y-8">
      <HeroSection featured={featured} />
      <CategoryStrip />
      <ArticleGrid articles={rest} />
    </div>
  );
}

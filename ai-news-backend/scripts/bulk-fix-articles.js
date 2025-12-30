import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://coinmarketbuzz.com";
const DEFAULT_IMAGE = `${SITE_URL}/default-news.jpg`;
const PUBLISHER_LOGO = `${SITE_URL}/brand/logo.png`;
const PUBLISHER_NAME = "CoinMarketBuzz";

const cleanTitle = (title) => {
  return title.replace(/^\[Analysis\]\s*/i, "")
              .replace(/^Daily Crypto Analysis:\s*/i, "")
              .trim();
};

async function main() {
  console.log("🔄 STARTING BULK CLEANUP...");

  const articles = await prisma.generatedArticle.findMany({
    include: { author: true },
  });

  for (const article of articles) {
    try {
      const originalHeadline = article.headline;
      const cleanedHeadline = cleanTitle(originalHeadline);

      // ✅ Update Dateline and remove patterns from body
      let updatedHtml = article.articleHtml
        .replace(/NEW YORK/gi, "VADODARA") 
        .replace(/\[Analysis\]/gi, "") 
        .replace(/Daily Crypto Analysis:/gi, "");

      const isAnalysis = originalHeadline.toLowerCase().includes("analysis") || 
                         (article.tags && article.tags.includes("Market Analysis"));

      // ✅ Rebuild JSON-LD with correct Type
      const newJsonLd = {
        "@context": "https://schema.org",
        "@type": isAnalysis ? "AnalysisNewsArticle" : "NewsArticle",
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${SITE_URL}/news/${article.slug}`,
        },
        headline: cleanedHeadline,
        description: article.metaDescription || cleanedHeadline,
        image: [article.imageUrl || DEFAULT_IMAGE],
        datePublished: article.createdAt.toISOString(),
        dateModified: article.updatedAt.toISOString(),
        author: {
          "@type": "Person",
          name: article.author?.name || "CoinMarketBuzz Desk",
          url: article.author?.slug ? `${SITE_URL}/authors/${article.author.slug}` : `${SITE_URL}/about`,
        },
        publisher: {
          "@type": "Organization",
          name: PUBLISHER_NAME,
          logo: { "@type": "ImageObject", url: PUBLISHER_LOGO },
        },
      };

      await prisma.generatedArticle.update({
        where: { id: article.id },
        data: {
          headline: cleanedHeadline,
          articleHtml: updatedHtml,
          newsJsonLd: newJsonLd,
        },
      });

      console.log(`✅ Processed: ${article.slug}`);
    } catch (err) {
      console.error(`❌ Error on ${article.slug}:`, err.message);
    }
  }
  console.log("✨ Cleanup Complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
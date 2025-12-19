import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Config - Change this to your real domain when deploying
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// ✅ Use a real public default image that exists on your site
// Put this file at: /public/default-news.jpg  (or change the path below)
const DEFAULT_IMAGE = `${SITE_URL}/default-news.jpg`;

// ✅ Your new brand logo (based on your frontend)
// Put this file at: /public/brand/logo.jpg
const PUBLISHER_LOGO = `${SITE_URL}/brand/logo.jpg`;

// ✅ Publisher name
const PUBLISHER_NAME = "CoinMarketBuzz";

async function main() {
  console.log("🔄 STARTING JSON-LD REGENERATION...");
  console.log(`Target Site URL: ${SITE_URL}\n`);

  // 1. Fetch all articles with their Author relation
  const articles = await prisma.generatedArticle.findMany({
    include: { author: true },
  });

  console.log(`Found ${articles.length} articles to update.`);

  for (const article of articles) {
    // A. Construct Valid Image (Fixes "Missing field image")
    const validImage =
      article.imageUrl && article.imageUrl.length > 0
        ? article.imageUrl
        : DEFAULT_IMAGE;

    // B. Construct Author (Fixes "undefined" URLs)
    const authorName = article.author?.name || "Editorial Team";
    const authorUrl = article.author?.slug
      ? `${SITE_URL}/authors/${article.author.slug}`
      : `${SITE_URL}/about`;

    // C. Build the Schema
    const newJsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${SITE_URL}/news/${article.slug}`,
      },
      headline: article.headline,
      description: article.metaDescription || article.headline,

      // ✅ Always an array with a valid URL
      image: [validImage],

      datePublished: article.createdAt.toISOString(),
      dateModified: article.updatedAt.toISOString(),

      // ✅ Valid author object with safe internal link
      author: {
        "@type": "Person",
        name: authorName,
        url: authorUrl,
      },

      // ✅ Updated publisher details to match your brand
      publisher: {
        "@type": "Organization",
        name: PUBLISHER_NAME,
        logo: {
          "@type": "ImageObject",
          url: PUBLISHER_LOGO,
        },
      },
    };

    // D. Save to Database
    await prisma.generatedArticle.update({
      where: { id: article.id },
      data: { newsJsonLd: newJsonLd }, // keep field type consistent with your schema
    });

    process.stdout.write("✅"); // Progress indicator
  }

  console.log("\n\n✨ JSON-LD Regeneration Complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());

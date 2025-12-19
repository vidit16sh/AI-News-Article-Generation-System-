import "dotenv/config";
import Bottleneck from "bottleneck";
import stringSimilarity from "string-similarity";
import { connectRabbit } from "../config/rabbit.js";
import prisma from "../lib/prisma.js";
import { generateArticle } from "../services/generator.service.js";
import { generateImage } from "../services/image.service.js";
import { downloadAndSaveImage } from "../services/storage.service.js";
import { getAuthorForCategory } from "../config/authors.js";
import {
  getEnrichedMarketData,
  generateChartUrl,
} from "../services/marketData.service.js";

const limiter = new Bottleneck({
  minTime: 2000,
  maxConcurrent: 1,
});

// ✅ Normalize base URL once (no trailing slash issues)
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

// Helper: Check Originality
const calculateOriginality = (aiText, sourceText) => {
  if (!sourceText || sourceText.length < 50) return 1.0;
  const similarity = stringSimilarity.compareTwoStrings(aiText, sourceText);
  return Math.round((1.0 - similarity) * 100) / 100;
};

// Helper: Revalidate Cache
const triggerRevalidation = async (tag) => {
  try {
    fetch(`${SITE_URL}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": process.env.API_SECRET_KEY,
      },
      body: JSON.stringify({ tag }),
    }).catch(() => {});
  } catch (error) {}
};

// ✅ Helper: ensure absolute URL (for JSON-LD compliance)
const toAbsoluteUrl = (pathOrUrl) => {
  if (!pathOrUrl) return `${SITE_URL}/default-news.jpg`;
  if (typeof pathOrUrl !== "string") return `${SITE_URL}/default-news.jpg`;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://"))
    return pathOrUrl;
  if (pathOrUrl.startsWith("/")) return `${SITE_URL}${pathOrUrl}`;
  return `${SITE_URL}/${pathOrUrl}`;
};

// JSON-LD Builder (strict image + strict author URL + correct publisher logo)
const createJsonLd = (article, url, authorObj) => {
  const validImage = toAbsoluteUrl(article.imageUrl);

  const authorName = authorObj?.name || "Editorial Team";
  const authorUrl = authorObj?.slug
    ? `${SITE_URL}/authors/${authorObj.slug}`
    : `${SITE_URL}/about`;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: article.headline,
    description: article.meta_description || article.headline,
    image: [validImage],
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: {
      "@type": "Person",
      name: authorName,
      url: authorUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "CoinMarketBuzz",
      logo: {
        "@type": "ImageObject",
        // ✅ Updated to match your current logo path in public/
        url: `${SITE_URL}/brand/logo.jpg`,
      },
    },
  };
};

// Helper: Get recent articles to create internal links
const getRecentArticlesForLinking = async (currentNewsId) => {
  try {
    const articles = await prisma.generatedArticle.findMany({
      where: {
        status: "PUBLISHED",
        originalNewsId: { not: currentNewsId },
      },
      take: 4,
      orderBy: { publishAt: "desc" },
      select: { headline: true, slug: true },
    });
    return articles;
  } catch (e) {
    console.error("   ⚠️ Error fetching recent articles:", e.message);
    return [];
  }
};

const processGenerationJob = async (msg, channel) => {
  const content = JSON.parse(msg.content.toString());
  const { newsId, priorityScore = 50, categoryTag } = content;

  console.log(`\n📝 [Gen-Worker] Processing Job: ${newsId}`);

  try {
    const cleanNews = await prisma.cleanedNews.findUnique({
      where: { id: newsId },
      include: { category: true },
    });

    if (!cleanNews) {
      channel.ack(msg);
      return;
    }

    // Idempotency
    const existing = await prisma.generatedArticle.findUnique({
      where: { originalNewsId: newsId },
    });
    if (existing) {
      channel.ack(msg);
      return;
    }

    // 1. Assign Author & Persona
    const assignedAuthorProfile = getAuthorForCategory(
      cleanNews.title,
      cleanNews.tags || []
    );

    const assignedAuthor = await prisma.author.findFirst({
      where: { slug: assignedAuthorProfile.slug },
    });

    const authorName = assignedAuthor ? assignedAuthor.name : "Editorial Team";
    const selectedPersona = assignedAuthorProfile.personaKey;

    console.log(`   👤 Author: ${authorName} | 🎭 Persona: ${selectedPersona}`);

    // 2. Data Injection (Market Data + Sentiment)
    console.log(`   📊 Checking for Market Data...`);
    const marketData = await getEnrichedMarketData(
      cleanNews.title + " " + cleanNews.summary
    );

    if (marketData) console.log(`   ✅ Live Data Found (Injecting...)`);

    // 3. Internal Linking Strategy
    const recentArticles = await getRecentArticlesForLinking(newsId);

    // 4. Generate Text (Pass Persona + Data + Links)
    console.log(`   🧠 Writing: "${cleanNews.title.substring(0, 30)}..."`);
    const aiOutput = await limiter.schedule(() =>
      generateArticle(cleanNews, marketData, recentArticles, selectedPersona)
    );

    // 🛑 FILTER 1: Discard WEAK generations
    if (aiOutput.status === "WEAK") {
      console.warn(`   🗑️ Discarding WEAK article: "${aiOutput.headline}"`);
      channel.ack(msg);
      return;
    }

    // 🛑 FILTER 2: Determine Status based on Priority Score
    let finalStatus = "QUEUED";
    if (priorityScore > 80) finalStatus = "PUBLISHED";
    else if (priorityScore >= 45) finalStatus = "QUEUED";
    else {
      console.warn(`   🗑️ Discarding LOW SCORE: ${priorityScore}`);
      channel.ack(msg);
      return;
    }

    // 5. VISUAL STRATEGY: Chart vs. AI Image
    let finalImageUrl = null;

    const headlineLower = (aiOutput.headline || "").toLowerCase();
    const tagsString = (aiOutput.tags || []).join(" ").toLowerCase();

    const isMarketStory =
      headlineLower.includes("price") ||
      headlineLower.includes("prediction") ||
      headlineLower.includes("analysis") ||
      headlineLower.includes("chart") ||
      headlineLower.includes("market") ||
      tagsString.includes("market");

    // A. Always Generate the Featured Image (AI Art)
    const categorySlug = cleanNews.category ? cleanNews.category.slug : "altcoins";
    const aiImage = await generateImage(aiOutput.headline, categorySlug);

    if (aiImage) {
      finalImageUrl = await downloadAndSaveImage(aiImage, aiOutput.slug);
    } else {
      finalImageUrl = "/default-news.jpg";
    }

    // B. If Market Story, Generate Chart & INJECT into Body
    if (isMarketStory) {
      console.log(`   📊 Market Story Detected: Generating Chart...`);
      const textForDetection = `${aiOutput.headline} ${cleanNews.title}`;
      const rawChartUrl = await generateChartUrl(textForDetection);

      if (rawChartUrl) {
        const localChart = await downloadAndSaveImage(
          rawChartUrl,
          aiOutput.slug + "-chart"
        );

        if (localChart) {
          console.log(`      ✅ Chart Injected into Article Body.`);

          const chartHtml = `
            <figure class="my-8">
              <img src="${localChart}" alt="${aiOutput.headline} Price Chart" class="w-full rounded-lg shadow-lg border border-gray-800" />
              <figcaption class="text-center text-sm text-gray-400 mt-2">7-Day Price Action via CoinGecko</figcaption>
            </figure>
          `;

          if (aiOutput.article_html?.includes("</p>")) {
            aiOutput.article_html = aiOutput.article_html.replace(
              "</p>",
              `</p>${chartHtml}`
            );
          } else {
            aiOutput.article_html = chartHtml + (aiOutput.article_html || "");
          }
        }
      }
    }

    // 6. Prepare Metadata & Save
    const fullUrl = `${SITE_URL}/news/${aiOutput.slug}`;
    const newsJsonLd = createJsonLd(
      { ...aiOutput, imageUrl: finalImageUrl },
      fullUrl,
      assignedAuthor
    );

    const realOriginalityScore = calculateOriginality(
      aiOutput.article_html,
      cleanNews.content
    );

    await prisma.generatedArticle.create({
      data: {
        headline: aiOutput.headline,
        slug: aiOutput.slug,
        metaDescription: aiOutput.meta_description,
        articleHtml: aiOutput.article_html,
        tags: categoryTag ? [categoryTag] : (aiOutput.tags || []),
        keywords: aiOutput.keywords || [],
        imageUrl: finalImageUrl,
        newsJsonLd,
        originalityScore: realOriginalityScore,
        confidenceScore: aiOutput.confidence || 0,
        priorityScore: priorityScore,
        status: finalStatus,
        publishAt: new Date(),
        originalNewsId: cleanNews.id,
        authorId: assignedAuthor ? assignedAuthor.id : null,
      },
    });

    console.log(`   ✨ Finished: ${aiOutput.slug} [${finalStatus}]`);

    if (finalStatus === "PUBLISHED") await triggerRevalidation("articles");
    channel.ack(msg);
  } catch (err) {
    console.error(`   ❌ Worker Error: ${err.message}`);
    channel.ack(msg);
  }
};

const startGenWorker = async () => {
  const channel = await connectRabbit();
  await channel.assertQueue("generation_queue", { durable: true });
  channel.prefetch(1);
  console.log("🚀 Gen Worker Started...");
  channel.consume("generation_queue", (msg) => {
    if (msg) processGenerationJob(msg, channel);
  });
};

startGenWorker();

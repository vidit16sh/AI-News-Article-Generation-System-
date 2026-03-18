import "dotenv/config";
import Bottleneck from "bottleneck";
import stringSimilarity from "string-similarity";
import { connectRabbit } from "../config/rabbit.js";
import prisma from "../lib/prisma.js";
import { generateArticle } from "../services/generator.service.js";
import { generateImage } from "../services/image.service.js";
import { downloadAndSaveImage } from "../services/storage.service.js";
import { getAuthorForCategory } from "../config/authors.js";
import { getEnrichedMarketData, generateChartUrl } from "../services/marketData.service.js";

const limiter = new Bottleneck({
  minTime: 2000,
  maxConcurrent: 1,
});

const QUALITY_GATES = {
  minConfidence: Number(process.env.GEN_MIN_CONFIDENCE || 0.65),
  minWordCount: Number(process.env.GEN_MIN_WORD_COUNT || 450),
  minOriginalityForPublish: Number(process.env.GEN_MIN_ORIGINALITY_FOR_PUBLISH || 0.55),
  minEditorialScore: Number(process.env.GEN_MIN_EDITORIAL_SCORE || 75),
};

const GEN_MIN_PRIORITY_SCORE = Number(process.env.GEN_MIN_PRIORITY_SCORE || 35);
const ALLOW_WEAK_FALLBACK = (process.env.ALLOW_WEAK_FALLBACK || "false") === "true";
const MAX_GENERATION_RETRIES = Number(process.env.MAX_GENERATION_RETRIES || 2);

const INTERNAL_APP_URL = (
  process.env.INTERNAL_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000"
).replace(/\/$/, "");

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || INTERNAL_APP_URL).replace(/\/$/, "");

const calculateOriginality = (aiText, sourceText) => {
  if (!sourceText || sourceText.length < 50) return 1.0;
  const similarity = stringSimilarity.compareTwoStrings(aiText, sourceText);
  return Math.round((1.0 - similarity) * 100) / 100;
};

const triggerRevalidation = async (tag) => {
  try {
    fetch(`${INTERNAL_APP_URL}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": process.env.API_SECRET_KEY,
      },
      body: JSON.stringify({
        tag,
        paths: ["/", "/archive", "/sitemap.xml", "/main-sitemap.xml", "/news-sitemap.xml", "/rss.xml"],
      }),
    }).catch(() => {});
  } catch {}
};

const countWordsFromHtml = (html = "") =>
  String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;

const isFallbackLikeContent = (html = "") => {
  const plain = String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

  const markers = [
    "developing story: details are still emerging",
    "coinmarketbuzz analysts are reviewing the details and will update this analysis shortly",
    "market update",
  ];

  return markers.filter((m) => plain.includes(m)).length >= 2;
};

const ensureUniqueSlug = async (candidate = "") => {
  const base =
    String(candidate || "coinmarketbuzz-report")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "coinmarketbuzz-report";

  let slug = base;
  for (let idx = 2; idx < 100; idx += 1) {
    const existing = await prisma.generatedArticle.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${idx}`;
  }
  return `${base}-${Date.now()}`;
};

const toAbsoluteUrl = (pathOrUrl) => {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return `${SITE_URL}/default-news.jpg`;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  if (pathOrUrl.startsWith("/")) return `${SITE_URL}${pathOrUrl}`;
  return `${SITE_URL}/${pathOrUrl}`;
};

const createJsonLd = (article, url, authorObj) => {
  const validImage = toAbsoluteUrl(article.imageUrl);
  const authorName = authorObj?.name || "Editorial Team";
  const authorUrl = authorObj?.slug ? `${SITE_URL}/authors/${authorObj.slug}` : `${SITE_URL}/about`;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: article.headline,
    description: article.meta_description || article.headline,
    image: [validImage],
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: { "@type": "Person", name: authorName, url: authorUrl },
    publisher: {
      "@type": "Organization",
      name: "CoinMarketBuzz",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/logo.png` },
    },
  };
};

const getRecentArticlesForLinking = async (currentNewsId) => {
  try {
    return await prisma.generatedArticle.findMany({
      where: { status: "PUBLISHED", originalNewsId: { not: currentNewsId } },
      take: 4,
      orderBy: { publishAt: "desc" },
      select: { headline: true, slug: true },
    });
  } catch (e) {
    console.error(`Error fetching recent articles: ${e.message}`);
    return [];
  }
};

const processGenerationJob = async (msg, channel) => {
  const content = JSON.parse(msg.content.toString());
  const { newsId, priorityScore = 50, categoryTag, retryCount = 0 } = content;

  console.log(`[Gen-Worker] Processing Job: ${newsId}`);

  try {
    const cleanNews = await prisma.cleanedNews.findUnique({
      where: { id: newsId },
      include: { category: true },
    });

    if (!cleanNews) {
      channel.ack(msg);
      return;
    }

    const existing = await prisma.generatedArticle.findUnique({ where: { originalNewsId: newsId } });
    if (existing) {
      channel.ack(msg);
      return;
    }

    const assignedAuthorProfile = getAuthorForCategory(cleanNews.title, cleanNews.tags || []);
    const assignedAuthor = await prisma.author.findFirst({ where: { slug: assignedAuthorProfile.slug } });

    const marketData = await getEnrichedMarketData(`${cleanNews.title} ${cleanNews.summary}`);
    const recentArticles = await getRecentArticlesForLinking(newsId);

    const aiOutput = await limiter.schedule(() =>
      generateArticle(cleanNews, marketData, recentArticles, assignedAuthorProfile.personaKey)
    );

    const editorialScore = Number(aiOutput.editorial_score || 0);
    if (editorialScore > 0 && editorialScore < QUALITY_GATES.minEditorialScore) {
      aiOutput.status = "WEAK";
    }

    const fallbackLike = isFallbackLikeContent(aiOutput.article_html || aiOutput.content || "");
    const isWeakFallback = aiOutput.status === "WEAK" || fallbackLike;
    if (isWeakFallback && !ALLOW_WEAK_FALLBACK) {
      console.warn(`[Gen-Worker] Rejected weak/fallback article for ${newsId}`);
      channel.ack(msg);
      return;
    }

    const confidence = Number(aiOutput.confidence || 0);
    const generatedWordCount = countWordsFromHtml(aiOutput.article_html || aiOutput.content || "");

    if (
      !isWeakFallback &&
      (confidence < QUALITY_GATES.minConfidence || generatedWordCount < QUALITY_GATES.minWordCount)
    ) {
      channel.ack(msg);
      return;
    }

    let finalStatus = "QUEUED";
    if (priorityScore > 80 && !isWeakFallback) finalStatus = "PUBLISHED";
    else if (priorityScore >= GEN_MIN_PRIORITY_SCORE && !isWeakFallback) finalStatus = "QUEUED";
    else {
      channel.ack(msg);
      return;
    }

    let finalImageUrl = null;
    let imageAltText = null;
    const headlineLower = (aiOutput.headline || "").toLowerCase();
    const tagsString = (aiOutput.tags || []).join(" ").toLowerCase();
    const isMarketStory =
      headlineLower.includes("price") ||
      headlineLower.includes("prediction") ||
      headlineLower.includes("analysis") ||
      headlineLower.includes("chart") ||
      headlineLower.includes("market") ||
      tagsString.includes("market");

    const categorySlug = cleanNews.category ? cleanNews.category.slug : "altcoins";
    // 🔴 PHASE 2: Capture both image URL and auto-generated alt text
    const aiImage = await generateImage(aiOutput.headline, categorySlug);
    
    if (aiImage) {
      // Handle both old format (URL string) and new format (object with URL + alt text)
      const imageUrl = typeof aiImage === 'string' ? aiImage : aiImage.url;
      imageAltText = typeof aiImage === 'object' ? aiImage.alt : null;
      finalImageUrl = await downloadAndSaveImage(imageUrl, aiOutput.slug);
    } else {
      finalImageUrl = "/default-news.jpg";
      imageAltText = `Cryptocurrency news about ${aiOutput.headline}`;
    }

    if (isMarketStory) {
      const rawChartUrl = await generateChartUrl(`${aiOutput.headline} ${cleanNews.title}`);
      if (rawChartUrl) {
        const localChart = await downloadAndSaveImage(rawChartUrl, `${aiOutput.slug}-chart`);
        if (localChart) {
          const chartHtml = `
            <figure class="my-8">
              <img src="${localChart}" alt="${aiOutput.headline} Price Chart" class="w-full rounded-lg shadow-lg border border-gray-800" />
              <figcaption class="text-center text-sm text-gray-400 mt-2">7-Day Price Action via CoinGecko</figcaption>
            </figure>
          `;
          if (aiOutput.article_html?.includes("</p>")) {
            aiOutput.article_html = aiOutput.article_html.replace("</p>", `</p>${chartHtml}`);
          } else {
            aiOutput.article_html = chartHtml + (aiOutput.article_html || "");
          }
        }
      }
    }

    const finalSlug = await ensureUniqueSlug(aiOutput.slug);
    aiOutput.slug = finalSlug;
    const fullUrl = `${SITE_URL}/news/${finalSlug}`;
    const newsJsonLd = createJsonLd({ ...aiOutput, imageUrl: finalImageUrl }, fullUrl, assignedAuthor);

    const realOriginalityScore = calculateOriginality(aiOutput.article_html, cleanNews.content);
    if (finalStatus === "PUBLISHED" && realOriginalityScore < QUALITY_GATES.minOriginalityForPublish) {
      finalStatus = "QUEUED";
    }

    const dataPackUsed = {
      ...(aiOutput.data_pack_used || {}),
      sourcePublishedAt: cleanNews.publishedAt ? new Date(cleanNews.publishedAt).toISOString() : null,
      generatedAt: new Date().toISOString(),
      sourceUrl: cleanNews.sourceUrl || null,
    };

    await prisma.generatedArticle.create({
      data: {
        headline: aiOutput.headline,
        slug: finalSlug,
        metaDescription: aiOutput.meta_description,
        articleHtml: aiOutput.article_html,
        tags: categoryTag ? [categoryTag] : (aiOutput.tags || []),
        keywords: aiOutput.keywords || [],
        imageUrl: finalImageUrl,
        imageAltText: imageAltText,
        newsJsonLd,
        originalityScore: realOriginalityScore,
        confidenceScore: aiOutput.confidence || 0,
        editorialScore: Number(aiOutput.editorial_score || 0),
        qualityScorecard: aiOutput.quality_scorecard || null,
        dataPackUsed,
        priorityScore,
        status: finalStatus,
        publishAt: new Date(),
        originalNewsId: cleanNews.id,
        authorId: assignedAuthor ? assignedAuthor.id : null,
      },
    });

    console.log(`Finished: ${finalSlug} [${finalStatus}]`);
    if (finalStatus === "PUBLISHED") await triggerRevalidation("articles");
    channel.ack(msg);
  } catch (err) {
    if (retryCount < MAX_GENERATION_RETRIES) {
      const nextPayload = { ...content, retryCount: retryCount + 1, lastError: err.message };
      channel.sendToQueue("generation_queue", Buffer.from(JSON.stringify(nextPayload)));
      console.warn(
        `Generation retry scheduled (${retryCount + 1}/${MAX_GENERATION_RETRIES}) for ${newsId}: ${err.message}`
      );
    } else {
      const dlqPayload = { ...content, failedAt: new Date().toISOString(), lastError: err.message };
      channel.sendToQueue("generation_dlq", Buffer.from(JSON.stringify(dlqPayload)));
      console.error(`Sent to generation_dlq after retries for ${newsId}: ${err.message}`);
    }
    console.error(`Worker error: ${err.message}`);
    channel.ack(msg);
  }
};

const startGenWorker = async () => {
  const channel = await connectRabbit();
  await channel.assertQueue("generation_queue", { durable: true });
  await channel.assertQueue("generation_dlq", { durable: true });
  channel.prefetch(1);
  console.log("Gen Worker Started...");
  channel.consume("generation_queue", (msg) => {
    if (msg) processGenerationJob(msg, channel);
  });
};

startGenWorker();

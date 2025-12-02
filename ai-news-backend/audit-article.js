import prisma from './src/lib/prisma.js';
import * as cheerio from 'cheerio';

async function auditLatestArticle() {
  console.log("🕵️‍♂️  Starting SEO & Quality Audit...\n");

  // 1. Fetch Latest Article
  const article = await prisma.generatedArticle.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: { originalNews: true }
  });

  if (!article) {
    console.error("❌ No PUBLISHED articles found to audit.");
    return;
  }

  const $ = cheerio.load(article.articleHtml);
  const textContent = $.text();
  const wordCount = textContent.split(/\s+/).length;
  const focusKeyword = article.tags[0] || "Crypto"; // Assuming first tag is focus

  console.log(`📰 Analyzing: "${article.headline}"`);
  console.log(`🔗 Slug: ${article.slug}`);
  console.log("---------------------------------------------------");

  let score = 100;
  let errors = [];

  // --- CHECK 1: META DATA ---
  const titleLen = article.headline.length;
  if (titleLen < 50 || titleLen > 75) {
    errors.push(`❌ Headline length bad: ${titleLen} chars (Target: 50-70)`);
    score -= 10;
  } else {
    console.log(`✅ Headline Length: ${titleLen} chars (Perfect)`);
  }

  const metaLen = article.metaDescription.length;
  if (metaLen < 130 || metaLen > 160) {
    errors.push(`❌ Meta Desc length bad: ${metaLen} chars (Target: 130-155)`);
    score -= 10;
  } else {
    console.log(`✅ Meta Desc Length: ${metaLen} chars (Perfect)`);
  }

  // --- CHECK 2: HTML STRUCTURE (E-E-A-T) ---
  const hasDateline = $('p:first-child strong').length > 0;
  if (!hasDateline) { errors.push("❌ Missing Dateline in Lead Paragraph"); score -= 15; }
  else console.log("✅ Dateline Detected");

  const h2Count = $('h2').length;
  if (h2Count < 4) { errors.push(`❌ Structure Weak: Only ${h2Count} H2 headers (Target: 4+)`); score -= 10; }
  else console.log(`✅ Structure Strong: ${h2Count} Sections`);

  const hasFAQ = $('h2:contains("Frequently Asked Questions")').length > 0 || $('h2:contains("FAQ")').length > 0;
  if (!hasFAQ) { errors.push("❌ Missing FAQ Section"); score -= 15; }
  else console.log("✅ FAQ Section Detected");

  // --- CHECK 3: CONTENT DEPTH ---
  if (wordCount < 800) { errors.push(`❌ Article too short: ${wordCount} words (Target: 1000+)`); score -= 20; }
  else console.log(`✅ Depth Good: ${wordCount} words`);

  // --- CHECK 4: KEYWORD DENSITY ---
  const regex = new RegExp(focusKeyword, "gi");
  const keywordCount = (textContent.match(regex) || []).length;
  const density = (keywordCount / wordCount) * 100;
  
  if (density < 0.5 || density > 3.0) {
     errors.push(`⚠️ Keyword Density Warning: ${density.toFixed(2)}% (Target: 1-2%)`);
     score -= 5;
  } else {
     console.log(`✅ Keyword Density: ${density.toFixed(2)}% (Natural)`);
  }

  console.log("---------------------------------------------------");
  if (errors.length > 0) {
    console.log("📉 IMPROVEMENTS NEEDED:");
    errors.forEach(e => console.log(e));
  }
  
  console.log(`\n🏆 FINAL QUALITY SCORE: ${score}/100`);
  console.log(`🤖 AI Confidence: ${(article.confidenceScore * 100).toFixed(0)}%`);
  console.log(`🦄 Originality: ${(article.originalityScore * 100).toFixed(0)}%`);
}

auditLatestArticle()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
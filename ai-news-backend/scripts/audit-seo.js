import prisma from '../src/lib/prisma.js';
import * as cheerio from 'cheerio';

async function auditAll() {
  console.log("📊 Starting Global SEO Audit...\n");

  const articles = await prisma.generatedArticle.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, slug: true, headline: true, metaDescription: true, articleHtml: true }
  });

  console.log(`found ${articles.length} published articles.\n`);
  console.log(`| Score | Slug `);
  console.log(`|-------|------------------------------------|`);

  let totalScore = 0;
  let lowQualityCount = 0;

  for (const article of articles) {
    let score = 100;
    const $ = cheerio.load(article.articleHtml);
    const text = $.text();
    const wordCount = text.split(/\s+/).length;

    // Rule 1: Length (> 800 words)
    if (wordCount < 800) score -= 20;

    // Rule 2: Structure (Has H2 headers)
    if ($('h2').length < 3) score -= 15;

    // Rule 3: Meta Description Length
    if (article.metaDescription.length < 120) score -= 10;

    // Rule 4: Internal Linking (Mentions other articles? - Advanced check skipped for speed)
    
    // Rule 5: Dateline Presence
    if (!$('strong').first().text().includes("—")) score -= 5;

    // Report Line
    const statusIcon = score >= 80 ? "Aa" : score >= 60 ? "⚠️" : "❌";
    console.log(`| ${statusIcon} ${score} | ${article.slug.substring(0, 50)}...`);

    totalScore += score;
    if (score < 60) lowQualityCount++;
  }

  const avgScore = Math.round(totalScore / articles.length);
  
  console.log("\n-----------------------------------");
  console.log(`🏁 FINAL REPORT`);
  console.log(`📈 Average SEO Score: ${avgScore}/100`);
  console.log(`📉 Low Quality Articles: ${lowQualityCount}`);
  console.log("-----------------------------------");
}

auditAll()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
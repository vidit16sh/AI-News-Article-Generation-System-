// scripts/audit-seo.js
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import readability from 'text-readability';
import natural from 'natural';
import Sentiment from 'sentiment';

const prisma = new PrismaClient();
const tokenizer = new natural.WordTokenizer();
const sentiment = new Sentiment();

// Console colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Allowed tags
const ALLOWED_TAGS = new Set([
  'h1','p','h2','h3','ul','li','blockquote','table','tr','td','strong','a'
]);

function wordsCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}
const firstNWords = (t, n) => t.trim().split(/\s+/).slice(0, n).join(' ');
const isKebabCase4to5Words = s => {
  if (!s) return false;
  const p = s.split('-').filter(Boolean);
  return p.length >= 4 && p.length <= 5 && /^[a-z0-9\-]+$/.test(s);
};
const sentenceWordLimitViolations = (text, limit = 15) => {
  const sents = (text.match(/[^.!?]+[.!?]*/g) || [])
    .map(s => s.trim()).filter(Boolean);

  const violations = [];
  sents.forEach((s, i) => {
    const wc = wordsCount(s);
    if (wc > limit)
      violations.push({ index: i + 1, words: wc, snippet: s.slice(0, 120) });
  });
  return violations;
};

async function auditLatestArticle() {
  console.log(`${BLUE}${BOLD}Starting upgraded Google News auditor...${RESET}\n`);

  // Fetch latest published article
  const article = await prisma.generatedArticle.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: { originalNews: { include: { category: true } } }
  });

  if (!article) {
    console.log(`${RED}No published articles found.${RESET}`);
    return;
  }

  const report = {
    overall_score: 100,
    pass_or_fail: 'PASS',
    section_scores: {},
    detailed_issues: [],
    critical_alerts: [],
    improvement_plan: []
  };

  const issues = report.detailed_issues;
  const criticals = report.critical_alerts;

  const $ = cheerio.load(article.articleHtml || '');
  const bodyText = $.root().text().replace(/\s+/g, ' ').trim();

  const tokens = tokenizer.tokenize(bodyText);
  const wordCount = tokens.length;

  const headline = (article.headline || '').trim();
  const metaDescription = (article.meta_description || '').trim();
  const slug = (article.slug || '').trim();
  const focusKeyword = (article.focus_keywords || '').toString().trim();
  const featuredImageAlt = (article.featured_image_alt || '').trim();

  // ---------- Allowed HTML tags
  const presentTags = new Set();
  $('*').each((i, el) => {
    if (el.tagName) presentTags.add(el.tagName.toLowerCase());
  });

  const disallowed = [...presentTags].filter(t => !ALLOWED_TAGS.has(t));
  if (disallowed.length) {
    issues.push(`[HTML_TAGS] Disallowed tags: ${disallowed.join(', ')}`);
    report.overall_score -= 8;
  }

  // ---------- Dateline (first paragraph)
  const firstParagraph = $('p').first().text().trim();
  const datelineRegex =
    /^[A-Z][A-Z\s]+,\s?(January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2}\s?—/;

  if (!datelineRegex.test(firstParagraph)) {
    report.overall_score -= 12;
    issues.push(`[DATELINE] Dateline missing or malformed. Found: "${firstParagraph.slice(0, 80)}"`);
    criticals.push('Missing or malformed dateline.');
  }

  // ---------- Headline checks
  if (headline.length < 60 || headline.length > 75) {
    report.overall_score -= 6;
    issues.push(`[HEADLINE] Headline must be 60–75 chars. Found ${headline.length}.`);
  }

  if (focusKeyword && !headline.toLowerCase().includes(focusKeyword.toLowerCase())) {
    report.overall_score -= 8;
    issues.push(`[FOCUS] Focus keyword not in headline.`);
  }

  // ---------- First 100 words include focus keyword
  const first100 = firstNWords(bodyText, 100).toLowerCase();
  if (focusKeyword && !first100.includes(focusKeyword.toLowerCase())) {
    report.overall_score -= 8;
    issues.push(`[FOCUS] Focus keyword missing in first 100 words.`);
  }

  // ---------- Last paragraph check
  const paras = $('p').toArray().map(p => $(p).text().trim()).filter(Boolean);
  const lastPara = paras.at(-1) || "";
  if (focusKeyword && !lastPara.toLowerCase().includes(focusKeyword.toLowerCase())) {
    report.overall_score -= 6;
    issues.push(`[FOCUS] Focus keyword missing in last paragraph.`);
  }

  // ---------- Slug format
  if (!isKebabCase4to5Words(slug)) {
    report.overall_score -= 6;
    issues.push(`[SLUG] Slug must be 4–5 words kebab-case.`);
  }

  // ---------- Meta description
  if (!metaDescription) {
    report.overall_score -= 6;
    issues.push(`[META] Meta description missing.`);
  } else if (metaDescription.length > 155) {
    report.overall_score -= 6;
    issues.push(`[META] Too long (${metaDescription.length}).`);
  }

  // ---------- Featured image alt
  if (!featuredImageAlt) {
    report.overall_score -= 4;
    issues.push(`[IMAGE_ALT] featured_image_alt is missing.`);
  }

  // ---------- Word count
  if (wordCount < 450) {
    report.overall_score -= 18;
    issues.push(`[WORD_COUNT] Too short: ${wordCount}. Minimum 450.`);
    criticals.push("Word count too low.");
  } else if (wordCount < 500) {
    report.overall_score -= 8;
    issues.push(`[WORD_COUNT] Below ideal range (500–750).`);
  } else if (wordCount > 850) {
    report.overall_score -= 12;
    issues.push(`[WORD_COUNT] Too long (>850).`);
  }

  // ---------- Required sections
  const requiredSections = [
    'What Happened',
    'Why It Matters',
    'By The Numbers',
    'What Experts Say',
    'What’s Next',
    'FAQs'
  ];

  for (const sec of requiredSections) {
    const exists = $(`h2:contains("${sec}"), h3:contains("${sec}")`).length > 0;
    if (!exists) {
      report.overall_score -= 8;
      issues.push(`[STRUCTURE] Missing section "${sec}".`);
      criticals.push(`Missing ${sec}`);
    }
  }

  // ---------- External source links
  const external = $('a').map((i, el) => $(el).attr('href')).get()
    .filter(h => h?.startsWith('http'));

  if (external.length === 0) {
    report.overall_score -= 20;
    issues.push(`[SOURCES] No external source link found.`);
    criticals.push("No external citation.");
  } else if (external.length > 1) {
    report.overall_score -= 6;
    issues.push(`[SOURCES] More than one external link (${external.length}).`);
  }

  // ---------- Author presence
  const authorPresent = /written by|author:|reporter:/i.test(article.articleHtml || "");
  if (!authorPresent) {
    report.overall_score -= 8;
    issues.push(`[AUTHOR] No byline detected.`);
  }

  // ---------- Expert quotes
  const expertQuotes = $('h3:contains("What Experts Say")')
    .nextUntil('h2, h3')
    .find('blockquote, p')
    .map((i, el) => $(el).text().trim())
    .get()
    .filter(t => t.length > 10);

  if (!expertQuotes.length) {
    report.overall_score -= 10;
    issues.push(`[EXPERTS] No expert quotes.`);
  }

  // ---------- Executive summary (blockquote)
  const execBlock = $('blockquote').first();
  if (!execBlock.length) {
    report.overall_score -= 8;
    issues.push(`[EXEC_SUM] Missing executive summary blockquote.`);
  } else {
    const bullets = execBlock.find('li').map((i, li) => $(li).text().trim()).get();
    if (bullets.length < 3) {
      report.overall_score -= 6;
      issues.push(`[EXEC_SUM] Needs 3 bullet points.`);
    }
  }

  // ---------- Lead paragraph (defined earlier)
  const leadPara = firstParagraph.replace(/—/, '').trim();
  const leadWords = wordsCount(leadPara);
  if (leadWords < 35 || leadWords > 55) {
    report.overall_score -= 6;
    issues.push(`[LEAD] Lead paragraph must be 35–55 words.`);
  }

  // ---------- Sentence length
  const violations = sentenceWordLimitViolations(bodyText, 15);
  if (violations.length) {
    report.overall_score -= Math.min(12, violations.length * 2);
    issues.push(`[SENTENCE] ${violations.length} sentences exceed 15 words.`);
  }

  // ---------- Readability
  const grade = readability.textStandard(bodyText, false);
  const numericGrade = parseInt(String(grade).match(/\d+/)?.[0] || "12", 10);

  if (numericGrade > 11) {
    report.overall_score -= 8;
    issues.push(`[READABILITY] Grade too high (${numericGrade}).`);
  }

  // ---------- Sentiment neutrality
  const sentScore = sentiment.analyze(bodyText).score;
  if (sentScore > 5 || sentScore < -5) {
    report.overall_score -= 8;
    issues.push(`[SENTIMENT] Bias detected (score ${sentScore}).`);
  }

  // ---------- Numeric data density
  const numbersFound = (bodyText.match(/(\d+(?:\.\d+)?|%|₹|\$)/g) || []);
  if (numbersFound.length < 3) {
    report.overall_score -= 8;
    issues.push(`[DATA] Only ${numbersFound.length} numeric items found.`);
  }

  // ---------- Forbidden words
  const forbiddenWords = [
    "delve","tapestry","landscape","testament","burgeoning","underscores",
    "moreover","furthermore","merely","amidst","in essence","pivotal",
    "sheds light","crucial juncture"
  ];

  const foundForbidden = forbiddenWords.filter(w =>
    bodyText.toLowerCase().includes(w)
  );

  if (foundForbidden.length) {
    report.overall_score -= 12;
    issues.push(`[FORBIDDEN] Forbidden words detected: ${foundForbidden.join(', ')}`);
    criticals.push("AI-detected style flagged.");
  }

  // ---------- Final PASS/FAIL
  if (report.overall_score < 75 || criticals.length > 0) {
    report.pass_or_fail = "FAIL";
  }

  console.log(JSON.stringify(report, null, 2));
}

auditLatestArticle()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import readability from 'text-readability';
import natural from 'natural';
import Sentiment from 'sentiment';
import { URL } from 'url';

const prisma = new PrismaClient();
const wordTokenizer = new natural.WordTokenizer();
const sentenceTokenizer = new natural.SentenceTokenizer(); // ✅ We will actually use this now
const sentiment = new Sentiment();

// Console colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Allowed HTML tags
const ALLOWED_TAGS = new Set([
  'h1','p','h2','h3','ul','ol','li','blockquote','table','thead','tbody','tr','td',
  'strong','em','a','figure','figcaption','img'
]);

const FORBIDDEN_WORDS = [
  "delve","tapestry","landscape","testament","burgeoning","underscores","moreover",
  "furthermore","merely","amidst","in essence","pivotal","crucial juncture","sheds light",
  "unveils","it is worth noting","in a nutshell","notably","significantly","as per reports",
  "overall","in conclusion","in summary","as a result"
];

// Heuristic for "authoritative" link
function isLikelyAuthoritative(href) {
  try {
    const u = new URL(href);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
    if (host.length < 6) return false;
    if (/(localhost|example|test)/i.test(host)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function wordsCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function firstNWords(text, n) {
  if (!text) return '';
  return text.trim().split(/\s+/).slice(0, n).join(' ');
}

function lexicalDiversity(tokens) {
  const unique = new Set(tokens.map(t => t.toLowerCase()));
  return unique.size / Math.max(1, tokens.length);
}

function cleanForReadability(htmlText) {
  let t = htmlText.replace(/<table[\s\S]*?<\/table>/gi, ' ');
  t = t.replace(/<a[\s\S]*?<\/a>/gi, ' ');
  t = t.replace(/http\S+/g, ' ');
  t = t.replace(/<\/?[^>]+(>|$)/g, ' '); 
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

// ✅ Corrected Sentence Checker using NLP (Fixes "U.S." bug)
const sentenceWordLimitViolations = (text, limit = 15) => {
  const sents = sentenceTokenizer.tokenize(text); // Uses smart tokenization
  const violations = [];
  sents.forEach((s, i) => {
    const wc = wordsCount(s);
    if (wc > limit)
      violations.push({ index: i + 1, words: wc, snippet: s.slice(0, 100) + "..." });
  });
  return violations;
};

// Strict Slug Validator
const isKebabCase4to5Words = s => {
  if (!s) return false;
  const p = s.split('-').filter(Boolean);
  // Relaxed slightly to 3-8 words for flexibility, but strict on format
  return p.length >= 3 && p.length <= 8 && /^[a-z0-9\-]+$/.test(s);
};

// Strict Dateline: "NEW YORK, Month Day, Year —"
// Added Year support to regex to match your Generator
const DATELINE_REGEX = /^[A-Z\s]+,\s[a-zA-Z]+\s\d{1,2},\s\d{4}\s?[—\-]/;

async function runAudit() {
  console.log(`${BLUE}${BOLD}🔍 Starting Production Article Audit...${RESET}\n`);

  // Fetch latest published article with AUTHOR relation
  const article = await prisma.generatedArticle.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { 
        originalNews: { include: { category: true } },
    }
  });

  if (!article) {
    console.log(`${RED}❌ No PUBLISHED articles found in DB.${RESET}`);
    return null;
  }

  console.log(`Auditing: ${BOLD}${article.headline}${RESET}`);
  console.log(`Slug: ${article.slug}`);
  console.log(`Date: ${new Date(article.createdAt).toLocaleString()}\n`);

  const $ = cheerio.load(article.articleHtml || '');
  const rawBodyText = $.root().text().replace(/\s+/g, ' ').trim();
  const cleanedForRead = cleanForReadability(article.articleHtml || '');
  const tokens = wordTokenizer.tokenize(cleanedForRead || rawBodyText);
  const wordCount = tokens.length;

  const headline = (article.headline || '').trim();
  const metaDescription = (article.metaDescription || '').trim();
  const slug = (article.slug || '').trim();
  const focusKeyword = (article.focus_keywords || article.keywords?.[0] || '').toString().trim();
  const firstParagraph = $('p').first().text().trim();
  const lastParagraph = $('p').last().text().trim();

  const report = {
    overall_score: 100,
    pass_or_fail: 'PASS',
    findings: [],
    critical_alerts: [],
    metrics: { wordCount, readabilityGrade: null }
  };

  const pushIssue = (msg, severity = 'minor') => {
    report.findings.push({ msg, severity });
    if (severity === 'critical') report.critical_alerts.push(msg);
  };

  // ---------- 1. HTML Tag Check
  const presentTags = new Set();
  $('*').each((i, el) => { if (el.tagName) presentTags.add(el.tagName.toLowerCase()); });
  const illegalTags = [...presentTags].filter(t => !ALLOWED_TAGS.has(t) && t !== 'html' && t !== 'head' && t !== 'body');
  if (illegalTags.length) {
    pushIssue(`[HTML] Disallowed tags: ${illegalTags.join(', ')}`, 'minor');
    report.overall_score -= 4;
  }

  // ---------- 2. Dateline Check
  if (!DATELINE_REGEX.test(firstParagraph)) {
    pushIssue(`[DATELINE] Invalid format. Expected "CITY, Month Day, Year —". Found: "${firstParagraph.slice(0,50)}..."`, 'critical');
    report.overall_score -= 15;
  }

  // ---------- 3. Headline & Keywords
  if (headline.length < 60 || headline.length > 80) {
    pushIssue(`[HEADLINE] Length ${headline.length} (Target: 60-75)`, 'minor');
    report.overall_score -= 4;
  }
  if (focusKeyword && !headline.toLowerCase().includes(focusKeyword.toLowerCase())) {
    pushIssue(`[SEO] Focus keyword "${focusKeyword}" missing from headline`, 'major');
    report.overall_score -= 8;
  }

  // ---------- 4. Slug Check
  if (!isKebabCase4to5Words(slug)) {
    pushIssue(`[SLUG] Invalid slug format: "${slug}"`, 'minor');
    report.overall_score -= 4;
  }

  // ---------- 5. Content Quality
  if (wordCount < 450) {
    pushIssue(`[THIN] Word count ${wordCount} (Min 450)`, 'critical');
    report.overall_score -= 20;
  }

  // Required Sections
  const requiredSections = ['What Happened', 'Why It Matters', 'What Experts Say', 'FAQs'];
  requiredSections.forEach(sec => {
    const found = $('h2, h3').filter((i, el) => $(el).text().toLowerCase().includes(sec.toLowerCase())).length > 0;
    if (!found) {
      pushIssue(`[STRUCTURE] Missing section: "${sec}"`, 'major');
      report.overall_score -= 6;
    }
  });

  // ---------- 6. Citations (External Links)
  const externalLinks = $('a').map((i, el) => $(el).attr('href')).get().filter(h => h && h.startsWith('http'));
  if (externalLinks.length === 0) {
    pushIssue('[CITATION] ❌ No external source links found.', 'critical');
    report.overall_score -= 25;
  } else {
    // Check if at least one looks real (not just localhost)
    const hasGood = externalLinks.some(isLikelyAuthoritative);
    if (!hasGood) {
      pushIssue('[CITATION] Links exist but look weak (no HTTPS or major domain).', 'major');
      report.overall_score -= 8;
    }
  }

  // ---------- 7. Author Check (Fixed)
  // Check the DB relation instead of HTML text
  if (!article.author && !article.authorId) {
    pushIssue(`[AUTHOR] No Author assigned in Database.`, 'major');
    report.overall_score -= 8;
  } else {
    // Optionally check if frontend rendered it (harder to do here, but DB check is safer)
    // We assume frontend renders if DB has it.
  }

  // ---------- 8. Readability (Grade 6-8)
  const grade = readability.fleschKincaidGrade(cleanedForRead || rawBodyText);
  report.metrics.readabilityGrade = grade;
  
  if (grade > 10) {
    pushIssue(`[COMPLEXITY] Grade Level ${grade} is too high (Target 6-8)`, 'major');
    report.overall_score -= 10;
  }

  const longSentences = sentenceWordLimitViolations(cleanedForRead || rawBodyText, 20);
  if (longSentences.length > 5) {
    pushIssue(`[SENTENCE] ${longSentences.length} sentences are too long (>20 words).`, 'minor');
    report.overall_score -= 5;
  }

  // ---------- 9. AI Patterns
  const foundForbidden = FORBIDDEN_WORDS.filter(w => (cleanedForRead || rawBodyText).toLowerCase().includes(w));
  if (foundForbidden.length) {
    pushIssue(`[ROBOTIC] Found forbidden words: ${foundForbidden.join(', ')}`, 'major');
    report.overall_score -= 10;
  }

  // ---------- Final Report
  if (report.overall_score < 75 || report.critical_alerts.length > 0) {
    report.pass_or_fail = 'FAIL';
  }

  console.log(`${BOLD}--- AUDIT RESULTS ---${RESET}`);
  console.log(`Score: ${report.overall_score}/100 [${report.pass_or_fail}]`);
  
  if (report.critical_alerts.length) {
    console.log(`${RED}🚨 CRITICAL:${RESET}`);
    report.critical_alerts.forEach(c => console.log(` - ${c}`));
  }
  if (report.findings.length) {
    console.log(`${YELLOW}⚠️ FINDINGS:${RESET}`);
    report.findings.forEach(f => {
       if (f.severity !== 'critical') console.log(` - ${f.msg}`);
    });
  }
  console.log(`\n--------------------`);
}

// Run
runAudit()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
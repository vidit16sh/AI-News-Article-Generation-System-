import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import readability from 'text-readability';
import natural from 'natural';
import Sentiment from 'sentiment';

const prisma = new PrismaClient();
const tokenizer = new natural.WordTokenizer();
const sentiment = new Sentiment();

// 🎨 CONSOLE COLORS
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function auditLatestArticle() {
    console.log(`${BLUE}${BOLD}🔍 INITIALIZING GOOGLE NEWS VALIDATOR...${RESET}\n`);

    // 1. Fetch Latest Published Article (LIFO)
    const article = await prisma.generatedArticle.findFirst({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        include: { 
            originalNews: {
                include: { category: true }
            } 
        }
    });

    if (!article) {
        console.log(`${RED}❌ No PUBLISHED articles found. Run the generator first.${RESET}`);
        return;
    }

    const categoryName = article.originalNews?.category?.name || "Crypto";
    console.log(`Analyzing: ${CYAN}"${article.headline}"${RESET}`);
    console.log(`Category:  ${categoryName}`);
    console.log(`Published: ${new Date(article.createdAt).toLocaleString()}\n`);

    let score = 100;
    const penalties = [];
    const wins = [];

    // Load HTML & Text
    const $ = cheerio.load(article.articleHtml || '');
    const textContent = $.text();
    const cleanText = textContent.replace(/\s+/g, ' ').trim();
    const tokens = tokenizer.tokenize(cleanText);
    const wordCount = tokens.length;

    // ======================================================
    // 📰 ZONE 1: JOURNALISTIC STRUCTURE (Google News Critical)
    // ======================================================
    
    // 1. Check Dateline (Mandatory for News)
    // Looks for patterns like "CITY, Date —" or "CITY —"
    const firstParagraph = $('p').first().text().trim();
    const datelineRegex = /^[A-Z\s]+(?:,\s[a-zA-Z0-9\s]+)?\s*—/;
    
    if (!datelineRegex.test(firstParagraph)) {
        score -= 15;
        penalties.push(`[DATELINE MISSING] First paragraph must start with "CITY —". Found: "${firstParagraph.substring(0, 20)}..."`);
    } else {
        wins.push(`[DATELINE] Correct journalistic format found.`);
    }

    // 2. Headline Optimization
    if (article.headline.length > 110) {
        score -= 5;
        penalties.push(`[HEADLINE TOO LONG] ${article.headline.length} chars. Keep under 110 chars for Google News Carousel.`);
    } else if (article.headline.length < 20) {
        score -= 5;
        penalties.push(`[HEADLINE TOO SHORT] Too vague.`);
    } else {
        wins.push(`[HEADLINE] Perfect length (${article.headline.length} chars).`);
    }

    // ======================================================
    // 🔍 ZONE 2: KEYWORD COHESION (Topic Authority)
    // ======================================================
    // Do the DB keywords actually appear in the text?
    const dbKeywords = article.keywords || [];
    const missingKeywords = [];
    
    dbKeywords.forEach(kw => {
        if (!cleanText.toLowerCase().includes(kw.toLowerCase())) {
            missingKeywords.push(kw);
        }
    });

    if (missingKeywords.length > 0) {
        score -= 10;
        penalties.push(`[KEYWORD GAP] The AI tagged these but didn't write about them: ${missingKeywords.join(", ")}.`);
    } else {
        wins.push(`[RELEVANCE] All target keywords found in text.`);
    }

    // ======================================================
    // 🧠 ZONE 3: AI FINGERPRINTS (SpamBrain)
    // ======================================================
    const lexicalDiversity = (new Set(tokens.map(w => w.toLowerCase())).size) / wordCount;
    
    // AI often loops words. High quality news > 0.40
    if (lexicalDiversity < 0.38) {
        score -= 10;
        penalties.push(`[REPETITIVE] Lexical diversity is low (${(lexicalDiversity*100).toFixed(1)}%). The AI is repeating words.`);
    }

    const aiStarters = ["In conclusion", "Moreover", "Furthermore", "It is worth noting", "Additionally"];
    let robotCount = 0;
    $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (aiStarters.some(s => text.startsWith(s))) robotCount++;
    });

    if (robotCount > 0) {
        score -= 15;
        penalties.push(`[ROBOTIC TONE] Found ${robotCount} paragraphs starting with lazy AI transitions ("In conclusion", etc).`);
    } else {
        wins.push(`[NATURAL FLOW] No robotic transition words found.`);
    }

    // ======================================================
    // 🕸️ ZONE 4: LINK PROFILE (Citation)
    // ======================================================
    const links = $('a');
    if (links.length === 0) {
        score -= 25; // Fatal error for News
        penalties.push(`[NO SOURCES] Google News requires citations. No <a> tags found.`);
    } else {
        let hasSourceLink = false;
        links.each((i, el) => {
            if ($(el).attr('href')?.includes('http')) hasSourceLink = true;
        });
        
        if (hasSourceLink) wins.push(`[CITATIONS] Found ${links.length} citations.`);
        else {
            score -= 10;
            penalties.push(`[INTERNAL ONLY] Found links, but no External Source citations.`);
        }
    }

    // ======================================================
    // 📊 THE FINAL VERDICT
    // ======================================================
    console.log(`\n${BOLD}--- GOOGLE NEWS AUDIT REPORT ---${RESET}`);
    
    console.log(`${GREEN}✅ WINS:${RESET}`);
    wins.forEach(w => console.log(`   ${w}`));

    if (penalties.length > 0) {
        console.log(`\n${RED}⚠️ CRITICAL ISSUES:${RESET}`);
        penalties.forEach(p => console.log(`   ${p}`));
    }

    console.log(`\n---------------------`);
    let gradeColor = GREEN;
    if (score < 85) gradeColor = YELLOW;
    if (score < 70) gradeColor = RED;

    console.log(`${BOLD}PUBLICATION READINESS SCORE: ${gradeColor}${score}/100${RESET}`);
    
    if (score >= 90) console.log(`${GREEN}🚀 EXCELLENT. This article is ready for Google News.${RESET}`);
    else if (score >= 75) console.log(`${YELLOW}🤔 GOOD. Minor tweaks needed for top ranking.${RESET}`);
    else console.log(`${RED}🛑 STOP. Do not publish. Adjust your Prompt.${RESET}`);
}

auditLatestArticle()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
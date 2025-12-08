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
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function auditLatestArticle() {
    console.log(`${BLUE}${BOLD}🔍 INITIALIZING GOOGLE SIMULATOR AUDIT...${RESET}\n`);

    // 1. Fetch Latest Published Article
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
        console.log(`${RED}❌ No PUBLISHED articles found.${RESET}`);
        return;
    }

    const categoryName = article.originalNews?.category?.name || "Unknown";
    console.log(`Analyzing: ${BOLD}"${article.headline}"${RESET}`);
    console.log(`Category: ${categoryName}`);
    console.log(`Slug: ${article.slug}\n`);

    let score = 100;
    const penalties = [];
    const wins = [];

    // Load HTML
    const $ = cheerio.load(article.articleHtml || '');
    const textContent = $.text();
    const cleanText = textContent.replace(/\s+/g, ' ').trim();
    const tokens = tokenizer.tokenize(cleanText);
    const wordCount = tokens.length;

    // ======================================================
    // 🧠 ZONE 1: SEMANTIC DENSITY (TF-IDF Simulation)
    // ======================================================
    // Google hates "Fluff". It wants "Information Gain".
    // We check if unique, complex words make up a good portion of the text.
    const uniqueWords = new Set(tokens.map(w => w.toLowerCase()));
    const lexicalDiversity = uniqueWords.size / wordCount;

    // Standard English is ~0.3. High-quality journalism is 0.45+. AI is often < 0.35.
    if (lexicalDiversity < 0.38) {
        score -= 15;
        penalties.push(`[FLUFF DETECTED] Lexical Diversity is low (${(lexicalDiversity*100).toFixed(1)}%). The AI is repeating itself. Increase 'Information Gain'.`);
    } else {
        wins.push(`[DEPTH] Good vocabulary variance (${(lexicalDiversity*100).toFixed(1)}%).`);
    }

    // ======================================================
    // 🎭 ZONE 2: SENTIMENT CONSISTENCY (E-E-A-T)
    // ======================================================
    // News should be neutral/objective (Score ~0). 
    // If it's too positive (+50), it's a press release/spam.
    // If it's too negative (-50), it's FUD (Fear, Uncertainty, Doubt).
    const sentimentResult = sentiment.analyze(cleanText);
    const comparativeScore = sentimentResult.comparative; // Score per word

    if (Math.abs(comparativeScore) > 0.15) {
        score -= 10;
        penalties.push(`[BIAS ALERT] Tone is too emotional (${comparativeScore.toFixed(2)}). News must be neutral. Use 'Objective' in prompt.`);
    } else {
        wins.push(`[NEUTRALITY] Tone is journalistic and objective.`);
    }

    // ======================================================
    // 🕸️ ZONE 3: LINK PROFILE (PageRank Simulation)
    // ======================================================
    const externalLinks = [];
    const internalLinks = [];
    $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('http')) externalLinks.push(href);
        else internalLinks.push(href);
    });

    if (externalLinks.length === 0) {
        score -= 20; // HUGE PENALTY
        penalties.push(`[ISOLATION] No external citations. Google views this as "Fake News". Link to sources!`);
    } else {
        wins.push(`[CITATIONS] Found ${externalLinks.length} external links.`);
    }

    if (internalLinks.length === 0) {
        score -= 5;
        penalties.push(`[SILOING] No internal links to categories. Bad for crawler navigation.`);
    }

    // ======================================================
    // 📚 ZONE 4: READABILITY (Google News Standard)
    // ======================================================
    const gradeLevel = readability.fleschKincaidGrade(cleanText);
    if (gradeLevel > 14) {
        score -= 10;
        penalties.push(`[UNREADABLE] Grade ${gradeLevel}. This is academic paper level. Lower it to Grade 10.`);
    } else if (gradeLevel < 7) {
        score -= 10;
        penalties.push(`[TOO SIMPLE] Grade ${gradeLevel}. This reads like a children's book. Increase analysis depth.`);
    } else {
        wins.push(`[READABILITY] Perfect Mass-Market Level (Grade ${gradeLevel}).`);
    }

    // ======================================================
    // 🤖 ZONE 5: AI FINGERPRINTS (Advanced)
    // ======================================================
    // Specific "Lazy AI" sentence starters
    const aiStarters = ["In conclusion", "It is important to note", "Moreover", "Furthermore", "Additionally"];
    let starterCount = 0;
    
    // Check start of paragraphs
    const paragraphs = textContent.split('\n').filter(p => p.length > 50);
    paragraphs.forEach(p => {
        aiStarters.forEach(starter => {
            if (p.trim().startsWith(starter)) starterCount++;
        });
    });

    if (starterCount > 2) {
        score -= 15;
        penalties.push(`[ROBOTIC STRUCTURE] ${starterCount} paragraphs start with lazy transition words ("Moreover", "In conclusion").`);
    }

    // ======================================================
    // 🏁 VERDICT
    // ======================================================
    console.log(`\n${BOLD}--- GOOGLE SIMULATOR RESULTS ---${RESET}`);
    console.log(`${GREEN}✅ WINS:${RESET}`);
    wins.forEach(w => console.log(`   ${w}`));

    console.log(`\n${RED}⚠️ PENALTIES:${RESET}`);
    penalties.forEach(p => console.log(`   ${p}`));

    console.log(`\n---------------------`);
    let gradeColor = GREEN;
    if (score < 80) gradeColor = YELLOW;
    if (score < 60) gradeColor = RED;

    console.log(`${BOLD}GOOGLE RANKING PROBABILITY: ${gradeColor}${score}%${RESET}`);
}

auditLatestArticle()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
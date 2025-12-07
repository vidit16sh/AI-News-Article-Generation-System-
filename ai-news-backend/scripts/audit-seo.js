// scripts/audit-seo.js
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import readability from 'text-readability';

const prisma = new PrismaClient();

// 🎨 CONSOLE COLORS
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function auditLatestArticle() {
    console.log(`${BLUE}${BOLD}🔍 INITIALIZING BRUTAL SEO AUDIT PROTOCOL...${RESET}\n`);

    // 1. Fetch Latest Published Article
    const article = await prisma.generatedArticle.findFirst({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        include: { Category: true }
    });

    if (!article) {
        console.log(`${RED}❌ No PUBLISHED articles found to audit.${RESET}`);
        return;
    }

    console.log(`Analyzing: ${BOLD}"${article.headline}"${RESET}`);
    console.log(`Slug: ${article.slug}\n`);

    let score = 100;
    const penalties = [];
    const wins = [];

    // Load HTML Parser
    const $ = cheerio.load(article.articleHtml || '');
    const textContent = $.text();
    const wordCount = textContent.split(/\s+/).length;

    // ======================================================
    // 💀 ZONE 1: THE "THIN CONTENT" CHECK (Panda Update)
    // ======================================================
    if (wordCount < 800) {
        score -= 20;
        penalties.push(`[THIN CONTENT] Word count is ${wordCount}. Google News prefers deep dives (1000+ words).`);
    } else if (wordCount > 2500) {
        wins.push(`[DEPTH] Excellent length (${wordCount} words) for a feature story.`);
    } else {
        wins.push(`[LENGTH] Good length (${wordCount} words).`);
    }

    // ======================================================
    // 🤖 ZONE 2: AI FINGERPRINT DETECTION (SpamBrain)
    // ======================================================
    // AI often uses specific transition phrases excessively.
    const roboticPhrases = [
        "In conclusion", "delve into", "testament to", "landscape", 
        "It is important to note", "In summary", "remains to be seen",
        "bustling", "vibrant", "tapestry"
    ];
    
    let roboticCount = 0;
    roboticPhrases.forEach(phrase => {
        const regex = new RegExp(phrase, 'gi');
        const count = (textContent.match(regex) || []).length;
        if (count > 0) roboticCount += count;
    });

    if (roboticCount > 3) {
        score -= 15;
        penalties.push(`[ROBOTIC TONE] Found ${roboticCount} AI-cliché phrases ("In conclusion", "delve", etc). Rewrite to sound human.`);
    } else {
        wins.push(`[HUMANITY] Low usage of robotic clichés.`);
    }

    // ======================================================
    // 🧠 ZONE 3: KEYWORD DENSITY & STUFFING (Penguin Update)
    // ======================================================
    // Extract main keyword from Slug (assuming slug is keyword-rich)
    const mainKeyword = article.slug.split('-')[0] || "crypto"; 
    const keywordRegex = new RegExp(mainKeyword, 'gi');
    const keywordCount = (textContent.match(keywordRegex) || []).length;
    const density = (keywordCount / wordCount) * 100;

    if (density > 2.5) {
        score -= 10;
        penalties.push(`[STUFFING] Keyword density for "${mainKeyword}" is ${density.toFixed(2)}%. Keep it under 2.5%.`);
    } else if (density < 0.3) {
        score -= 5;
        penalties.push(`[INVISIBLE] Keyword "${mainKeyword}" barely appears (${density.toFixed(2)}%). Google won't know what this is about.`);
    } else {
        wins.push(`[SEO] Healthy Keyword Density (${density.toFixed(2)}%).`);
    }

    // ======================================================
    // 🕸️ ZONE 4: STRUCTURE & HIERARCHY
    // ======================================================
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;

    if (h2Count < 3) {
        score -= 10;
        penalties.push(`[STRUCTURE] Only ${h2Count} <h2> tags. Google scanners need clear section breaks.`);
    } else {
        wins.push(`[STRUCTURE] Good hierarchy (${h2Count} H2s, ${h3Count} H3s).`);
    }

    // Check for Links (Citations)
    const linkCount = $('a').length;
    if (linkCount < 2) {
        score -= 10;
        penalties.push(`[ISOLATION] This article has no links. Google News requires citing sources or internal linking.`);
    }

    // ======================================================
    // 🤓 ZONE 5: READABILITY (Flesch-Kincaid)
    // ======================================================
    // Google prefers "Easy to Read" (Grade 7-9) for mass news, 
    // but "Grade 10-12" for financial deep dives.
    const gradeLevel = readability.fleschKincaidGrade(textContent);
    
    if (gradeLevel > 14) {
        score -= 5;
        penalties.push(`[COMPLEXITY] Grade Level ${gradeLevel}. Too academic. Simplify sentences.`);
    } else if (gradeLevel < 6) {
        score -= 5;
        penalties.push(`[SIMPLE] Grade Level ${gradeLevel}. Too childish for finance news.`);
    } else {
        wins.push(`[READABILITY] Perfect tone (Grade ${gradeLevel}).`);
    }

    // ======================================================
    // 🧩 ZONE 6: SCHEMA.ORG & METADATA (The Technicals)
    // ======================================================
    // Check if JSON-LD allows Google News to index it
    if (!article.keywords || article.keywords.length === 0) {
        score -= 10;
        penalties.push(`[METADATA] No Keywords/Tags found.`);
    }

    if (!article.metaDescription || article.metaDescription.length < 50) {
        score -= 10;
        penalties.push(`[METADATA] Meta Description missing or too short.`);
    }

    // ======================================================
    // 📊 THE FINAL VERDICT
    // ======================================================
    console.log(`\n${BOLD}--- AUDIT RESULTS ---${RESET}`);
    
    console.log(`${GREEN}✅ WINS:${RESET}`);
    wins.forEach(w => console.log(`   ${w}`));

    console.log(`\n${RED}⚠️ PENALTIES:${RESET}`);
    penalties.forEach(p => console.log(`   ${p}`));

    console.log(`\n---------------------`);
    let gradeColor = GREEN;
    if (score < 80) gradeColor = YELLOW;
    if (score < 60) gradeColor = RED;

    console.log(`${BOLD}FINAL SEO SCORE: ${gradeColor}${score}/100${RESET}`);

    if (score >= 90) console.log(`${GREEN}🚀 READY TO RANK ON GOOGLE NEWS!${RESET}`);
    else if (score >= 70) console.log(`${YELLOW}🤔 DECENT, BUT NEEDS POLISH.${RESET}`);
    else console.log(`${RED}💀 INVISIBLE. DO NOT PUBLISH.${RESET}`);
}

auditLatestArticle()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
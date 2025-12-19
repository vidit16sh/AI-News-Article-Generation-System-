import OpenAI from "openai";
import prisma from '../lib/prisma.js';

// 🔌 Connect to DeepSeek via OpenAI SDK
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// 1. 🏷️ STRICT TAXONOMY (The Source of Truth)

const TAXONOMY = {
    bitcoin: {
        name: 'Bitcoin',
        keywords: ['bitcoin', 'btc', 'satoshi', 'halving']
    },
    ethereum: {
        name: 'Ethereum',
        keywords: ['ethereum', 'eth', 'vitalik', 'erc-20']
    },
    // ✅ CHANGED: slug 'altcoins' to 'crypto' to match Header
    crypto: {
        name: 'Crypto News',
        keywords: ['solana', 'cardano', 'xrp', 'altcoin', 'doge', 'pepe']
    },
    // ✅ ADDED: 'defi' to match Header
    defi: {
        name: 'DeFi & Forex', // Combined logic
        keywords: ['defi', 'dex', 'uniswap', 'forex', 'fx', 'trading']
    },
    regulation: {
        name: 'Regulation',
        keywords: ['sec', 'gensler', 'lawsuit', 'legal', 'compliance']
    },
    finance: {
        name: 'Finance',
        keywords: ['fed', 'interest rate', 'inflation', 'stocks', 'etf']
    }
};

/**
 * 🕵️‍♂️ Phase 1: Local Keyword Scan (Fast & Free)
 * Scans text for keywords to give DeepSeek a strong "Hint".
 */
const getKeywordHint = (text) => {
    const lowerText = text.toLowerCase();
    let bestSlug = 'altcoins'; // Default fallback
    let maxScore = 0;

    for (const [slug, data] of Object.entries(TAXONOMY)) {
        let score = 0;
        data.keywords.forEach(word => {
            if (lowerText.includes(word)) score += 1;
        });
        if (score > maxScore) {
            maxScore = score;
            bestSlug = slug;
        }
    }
    return bestSlug;
};

export const classifyNews = async (text, title) => {
    // 1. Run Fast Local Scan
    const localHintSlug = getKeywordHint(title + " " + text);
    const validSlugs = Object.keys(TAXONOMY).join(', ');

    // 2. ASK DEEPSEEK for Strict Scoring & Validation
    try {
        const systemPrompt = `
            Act as a Senior News Editor for a Financial Terminal.
            Your job is to:
            1. Assign a **Priority Score (0-100)** to filter spam.
            2. Assign the **Correct Category Slug** from the allowed list.

            ### ALLOWED CATEGORY SLUGS (Strict):
            [${validSlugs}]

            ### SCORING MATRIX (Be Ruthless):
            **💎 CRITICAL (85-100):** Global Gov Bans, SEC Lawsuits, Major Hacks >$50M, Binance/Coinbase Listings, Fed Rates.
            **⚠️ HIGH (70-84):** 10%+ Price Moves, Mainnet Launches, Big Partnerships.
            **📉 STANDARD (40-69):** Routine Analysis, Weekly Recaps, Opinion.
            **🗑️ LOW (0-39):** "Top 3 Coins to Buy", Airdrop Tutorials, Spam, Press Releases.

            ### OUTPUT FORMAT (JSON ONLY):
            {
                "category_slug": "String (MUST be one of the allowed slugs)",
                "priority_score": Number (Integer 0-100),
                "reasoning": "Short sentence explaining the score."
            }
        `;

        const userPrompt = `
            ### INPUT DATA
            **Headline:** "${title}"
            **Snippet:** "${text.substring(0, 600)}..."
            **Local Keyword Hint:** ${localHintSlug} (Use this if it makes sense, but correct it if wrong).
        `;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "deepseek-chat",
            response_format: { type: "json_object" },
            temperature: 0.1, 
        });

        // Parse Response
        const rawContent = completion.choices[0].message.content;
        const cleanContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleanContent);
        
        // Validation: Ensure returned slug is valid, else fallback to hint
        const finalSlug = TAXONOMY[json.category_slug] ? json.category_slug : localHintSlug;

        return {
            category_slug: finalSlug,
            category_name: TAXONOMY[finalSlug].name,
            priority_score: json.priority_score || 0,
            reasoning: json.reasoning || "DeepSeek Classification"
        };

    } catch (error) {
        console.error("⚠️ DeepSeek Classify Error:", error.message);
        // Fallback: Use the local hint and a safe 'Standard' score
        return { 
            category_slug: localHintSlug, 
            category_name: TAXONOMY[localHintSlug].name,
            priority_score: 50, 
            reasoning: "API Failed - Using Local Keyword Match" 
        }; 
    }
};

// Helper: Ensure category exists in DB before linking
export const getOrCreateCategory = async (slug) => {
    // If we get a weird slug, default to 'altcoins'
    const safeSlug = TAXONOMY[slug] ? slug : 'altcoins';
    const name = TAXONOMY[safeSlug].name;
    
    return await prisma.category.upsert({
        where: { slug: safeSlug }, // Best practice: Upsert by @unique slug
        update: {},
        create: { 
            name: name,
            slug: safeSlug
        }
    });
};
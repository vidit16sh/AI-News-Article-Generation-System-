import OpenAI from "openai";
import prisma from '../lib/prisma.js';

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// 1. 🏷️ STRICT TAXONOMY (Synchronized with Header.jsx slugs)
const TAXONOMY = {
    bitcoin: {
        name: 'Bitcoin',
        keywords: ['bitcoin', 'btc', 'satoshi', 'halving']
    },
    ethereum: {
        name: 'Ethereum',
        keywords: ['ethereum', 'eth', 'vitalik', 'erc-20']
    },
    // ✅ Slug matches Header.jsx link "/category/crypto"
    crypto: {
        name: 'Crypto News',
        keywords: ['solana', 'cardano', 'xrp', 'altcoin', 'doge', 'pepe', 'crypto', 'blockchain']
    },
    // ✅ Slug matches Header.jsx link "/category/defi"
    defi: {
        name: 'DeFi & Forex',
        keywords: ['defi', 'dex', 'uniswap', 'forex', 'fx', 'trading', 'liquidity', 'yield']
    },
    regulation: {
        name: 'Regulation',
        keywords: ['sec', 'gensler', 'lawsuit', 'legal', 'compliance', 'ban', 'fca']
    },
    finance: {
        name: 'Finance',
        keywords: ['fed', 'interest rate', 'inflation', 'stocks', 'etf', 'macro', 'economy', 'blackrock']
    }
};

/**
 * 🕵️‍♂️ Phase 1: Local Keyword Scan
 * Fixed the fallback to 'crypto' since 'altcoins' was removed.
 */
const getKeywordHint = (text) => {
    const lowerText = text.toLowerCase();
    let bestSlug = 'crypto'; // ✅ Corrected Fallback
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
    const localHintSlug = getKeywordHint(title + " " + text);
    const validSlugs = Object.keys(TAXONOMY).join(', ');

    try {
        const systemPrompt = `
            Act as a Senior News Editor for a Financial Terminal.
            Assign a Priority Score (0-100) and the Correct Category Slug.
            ALLOWED SLUGS: [${validSlugs}]
            SCORING: 85+ (Breaking/Critical), 70-84 (High), 40-69 (Standard), <40 (Spam).  

            ### OUTPUT FORMAT:
            You must return the response as a json object.
        `;

        const userPrompt = `
            ### INPUT DATA
            **Headline:** "${title}"
            **Snippet:** "${text.substring(0, 600)}..."
            **Local Keyword Hint:** ${localHintSlug} 
            Return the result in json format.
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

        const json = JSON.parse(completion.choices[0].message.content);
        
        // Validation: Ensure returned slug is valid
        const finalSlug = TAXONOMY[json.category_slug] ? json.category_slug : localHintSlug;

        return {
            category_slug: finalSlug,
            category_name: TAXONOMY[finalSlug].name,
            priority_score: json.priority_score || 0,
            reasoning: json.reasoning || "DeepSeek Classification"
        };

    } catch (error) {
        console.error("⚠️ DeepSeek Classify Error:", error.message);
        return { 
            category_slug: localHintSlug, 
            category_name: TAXONOMY[localHintSlug].name,
            priority_score: 50, 
            reasoning: "API Failed - Using Local Keyword Match" 
        }; 
    }
};

export const getOrCreateCategory = async (slug) => {
    // ✅ Corrected Fallback to 'crypto'
    const safeSlug = TAXONOMY[slug] ? slug : 'crypto';
    const name = TAXONOMY[safeSlug].name;
    
    return await prisma.category.upsert({
        where: { slug: safeSlug },
        update: {},
        create: { 
            name: name,
            slug: safeSlug
        }
    });
};
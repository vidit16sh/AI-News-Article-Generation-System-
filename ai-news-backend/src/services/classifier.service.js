import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from '../lib/prisma.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" } 
});

// Rule-based keywords (Fast/Free) - Now maps to Objects
const RULES = {
    // 🪙 CRYPTO DEEP DIVE
    'Bitcoin': ['bitcoin', 'btc', 'satoshi', 'halving', 'lightning network'],
    'Ethereum': ['ethereum', 'eth', 'vitalik', 'erc-20', 'layer 2', 'optimism', 'arbitrum'],
    'DeFi': ['defi', 'uniswap', 'aave', 'dex', 'liquidity pool', 'yield farming', 'staking'],
    'Altcoins': ['solana', 'cardano', 'xrp', 'doge', 'pepe', 'meme coin', 'avalanche'],
    'Crypto Regulation': ['sec', 'gensler', 'crypto law', 'mica', 'stablecoin regulation'],

    // 🤖 AI REVOLUTION
    'Generative AI': ['chatgpt', 'gemini', 'midjourney', 'llm', 'claude', 'anthropic', 'open ai'],
    'Robotics': ['robot', 'humanoid', 'boston dynamics', 'tesla bot', 'automation'],
    'AI Hardware': ['nvidia', 'gpu', 'tsmc', 'ai chip', 'sam altman', 'h100'],

    // 💱 FOREX & MACRO
    'Forex': ['eur/usd', 'gbp', 'jpy', 'forex', 'currency pair', 'dxy', 'dollar index'],
    'Central Banks': ['fed', 'fomc', 'powell', 'ecb', 'interest rate', 'rate hike', 'inflation', 'cpi'],
    'Commodities': ['gold', 'oil', 'crude', 'silver', 'natural gas', 'brent'],
};

export const classifyNews = async (text, title) => {
    const combinedText = (title + " " + text).toLowerCase();

    // 1. TRY RULES FIRST (Fast Path)
    for (const [category, keywords] of Object.entries(RULES)) {
        if (keywords.some(k => combinedText.includes(k))) {
            // ✅ Return OBJECT, not String
            return {
                category: category,
                priority_score: 50, // Default for rules
                reasoning: `Matched keyword rule ${category}`
            };
        }
    }

    // 2. IF NO RULES MATCH, ASK AI
    try {
        const prompt = `
            Analyze this news item and return a JSON object with classification details.
            
            Headline: "${title}"
            Content Snippet: "${text.substring(0, 500)}..."

            ### SCORING RULES (0-100)
            - **90-100 (BREAKING):** Major hacks (> $100M), SEC/Govt lawsuits, Bitcoin ATH, Binance/Coinbase insolvencies.
            - **70-89 (HIGH):** New Token Listings (Binance/Coinbase), Major Partnerships (Amazon/Google), ETF Approvals.
            - **40-69 (STANDARD):** Price analysis, minor protocol updates, opinion pieces, daily recaps.
            - **0-39 (LOW/SPAM):** "Top 3 coins to buy", Airdrop farming guides, minor NFT mints, press releases.

            ### OUTPUT FORMAT (Strict JSON)
            {
                "category": "Crypto" | "Finance" | "Tech" | "Global",
                "priority_score": Number,
                "reasoning": "Short string explaining the score"
            }
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const json = JSON.parse(response.text());
        
        return json; 

    } catch (error) {
        console.error("⚠️ AI Classify Error:", error.message);
        // Fallback safe default (Object)
        return { category: 'General', priority_score: 50, reasoning: 'Error fallback' }; 
    }
};

export const getOrCreateCategory = async (name) => {
    let cat = await prisma.category.findUnique({ where: { name } });
    if (!cat) {
        cat = await prisma.category.create({ data: { name } });
    }
    return cat;
};
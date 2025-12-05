import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from '../lib/prisma.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" } 
});

// Rule-based keywords (Fast/Free) - Now maps to Objects
const RULES = {
    'Crypto': ['bitcoin', 'ethereum', 'blockchain', 'web3', 'defi', 'binance'],
    'Finance': ['inflation', 'interest rate', 'fed', 'bank', 'economy', 'tax'],
    'Tech': ['apple', 'google', 'microsoft', 'ai', 'software', 'update'],
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
                reasoning: "Matched keyword rule"
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
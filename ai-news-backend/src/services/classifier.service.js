import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from '../lib/prisma.js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Fast & Cheap model

// Rule-based keywords (Fast/Free)
const RULES = {
    'Crypto': ['bitcoin', 'ethereum', 'blockchain', 'web3', 'defi', 'binance'],
    'Finance': ['inflation', 'interest rate', 'fed', 'bank', 'economy', 'tax'],
    'Tech': ['apple', 'google', 'microsoft', 'ai', 'software', 'update'],
    'Stocks': ['nasdaq', 'sp500', 'dow jones', 'shares', 'stock market']
};

export const classifyNews = async (text, title) => {
    const combinedText = (title + " " + text).toLowerCase();

    // 1. TRY RULES FIRST
    for (const [category, keywords] of Object.entries(RULES)) {
        if (keywords.some(k => combinedText.includes(k))) {
            return category;
        }
    }

    // 2. IF NO RULES MATCH, ASK AI
    try {
        const prompt = `
          Analyze this news item. Return a JSON object:
          {
            "category": "Crypto" | "Tech" | "Finance",
            "priority_score": Number (0-100),
            "reasoning": "String (short explanation)"
          }
            
          Scoring Rules:
          - 90-100: "Breaking" (Major hacks, SEC lawsuits, BTC/ETH price moves >5%).
          - 70-89:  "Important" (Partnerships, new product launches, listings).
          - 40-69:  "Standard" (Daily analysis, minor updates, opinion pieces).
          - 0-39:   "Noise" (Airdrop spam, minor NFT mints, press releases).
            
          Title: ${title}
          Content: ${text.substring(0, 500)}...
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();

    } catch (error) {
        console.error("AI Error:", error.message);
        return 'Global'; // Fallback
    }
};

// Helper to ensure category exists in DB before saving
export const getOrCreateCategory = async (name) => {
    let cat = await prisma.category.findUnique({ where: { name } });
    if (!cat) {
        cat = await prisma.category.create({ data: { name } });
    }
    return cat;
};

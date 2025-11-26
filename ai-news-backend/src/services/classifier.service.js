import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from '../config/db.js';

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
            Classify this news article into exactly one of these categories: 
            [Crypto, Finance, Stocks, Tech, Global, Sports, Politics].
            Return ONLY the category name.
            Title: ${title}
            Content: ${text.substring(0, 300)}...
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

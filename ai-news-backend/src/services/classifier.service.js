import OpenAI from "openai";
import prisma from '../lib/prisma.js';

// 🔌 Connect to DeepSeek via OpenAI SDK
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// 1. Define Categories & Keywords for "Hinting"
// (Kept exactly the same to guide the AI)
const CATEGORY_HINTS = {
    // 🪙 Crypto
    'Bitcoin': ['bitcoin', 'btc', 'satoshi', 'halving'],
    'Ethereum': ['ethereum', 'eth', 'vitalik', 'erc-20', 'layer 2'],
    'DeFi': ['defi', 'uniswap', 'aave', 'dex', 'yield farming', 'staking', 'tvl'],
    'Altcoins': ['solana', 'cardano', 'xrp', 'doge', 'pepe', 'meme coin'],
    'Crypto Regulation': ['sec', 'gensler', 'mica', 'crypto law', 'stablecoin bill'],

    // 🤖 AI
    'Generative AI': ['chatgpt', 'gemini', 'midjourney', 'llm', 'anthropic', 'openai', 'sora'],
    'AI Hardware': ['nvidia', 'gpu', 'h100', 'tsmc', 'sam altman', 'ai chip'],
    'Robotics': ['robot', 'humanoid', 'boston dynamics', 'tesla bot', 'figure 01'],

    // 💱 Finance
    'Forex': ['eur/usd', 'gbp', 'jpy', 'forex', 'dxy', 'dollar index'],
    'Central Banks': ['fed', 'fomc', 'powell', 'ecb', 'interest rate', 'inflation', 'cpi'],
    'Commodities': ['gold', 'oil', 'crude', 'silver', 'natural gas', 'brent'],
};

export const classifyNews = async (text, title) => {
    // 1. Identify Potential Category via Keywords (Fast Hint)
    let suggestedCategory = "General";
    const combinedLower = (title + " " + text).toLowerCase();
    
    for (const [cat, keywords] of Object.entries(CATEGORY_HINTS)) {
        if (keywords.some(k => combinedLower.includes(k))) {
            suggestedCategory = cat;
            break; 
        }
    }

    // 2. ASK DEEPSEEK for Strict Scoring
    try {
        // We split the prompt into System (Rules) and User (Data) for DeepSeek's API
        const systemPrompt = `
            Act as a Senior News Editor. Analyze the story provided by the user and assign a **Priority Score (0-100)** and **Category**.

            ### SCORING MATRIX (Strict Filter)
            We only publish the top 5-10 stories daily. Be harsh.
            
            **💎 CRITICAL (Score 85-100):**
            - **Global Impact:** Government Bans, SEC Lawsuits, Country Adopts Crypto.
            - **Massive Scale:** Hacks >$50M, Bankruptcy of Major Exchange.
            - **Market Movers:** Fed Rate Decision, Bitcoin ATH, Nvidia Earnings.
            - **Tech Breakthroughs:** GPT-5 Release, Major Scientific Discovery.

            **⚠️ HIGH (Score 70-84):**
            - **Significant:** Binance/Coinbase new listings, Google/Apple partnerships.
            - **Notable:** 10%+ Price swings, Mainnet launches.

            **📉 STANDARD (Score 40-69):**
            - **Routine:** Analyst price predictions ("Bitcoin to $1M?"), Opinion pieces, Weekly recaps.
            - **Updates:** Minor software patches, wallet updates.

            **🗑️ LOW (Score 0-39):**
            - **Spam:** "Top 3 coins to buy now", Airdrop tutorials, Press releases.

            ### OUTPUT FORMAT (JSON)
            Output STRICT JSON. Do not include markdown ticks.
            {
                "category": "String (Best Fit from: Bitcoin, Ethereum, DeFi, Crypto Regulation, Generative AI, AI Hardware, Robotics, Forex, Central Banks, Commodities, Global)",
                "priority_score": Number (Integer 0-100),
                "reasoning": "Short sentence explaining why it got this score."
            }
        `;

        const userPrompt = `
            ### INPUT DATA
            **Headline:** "${title}"
            **Snippet:** "${text.substring(0, 600)}..."
            **Keyword Hint:** ${suggestedCategory}
        `;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "deepseek-chat", // DeepSeek V3
            response_format: { type: "json_object" }, // Enforces JSON
            temperature: 0.1, // Low temp for strict/consistent scoring
        });

        // Parse response (DeepSeek is usually clean, but we strip ticks just in case)
        const rawContent = completion.choices[0].message.content;
        const cleanContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleanContent);
        
        return {
            category: json.category || suggestedCategory,
            priority_score: json.priority_score || 0,
            reasoning: json.reasoning || "DeepSeek Classification"
        };

    } catch (error) {
        console.error("⚠️ DeepSeek Classify Error:", error.message);
        // Fallback: Default to low score to be safe if API fails
        return { 
            category: suggestedCategory, 
            priority_score: 40, 
            reasoning: "API Failed - Defaulting to Low Score" 
        }; 
    }
};

export const getOrCreateCategory = async (name) => {
    const cleanName = name.trim();
    
    return await prisma.category.upsert({
        where: { name: cleanName },
        update: {},
        create: { name: cleanName }
    });
};
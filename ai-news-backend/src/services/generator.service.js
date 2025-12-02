import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use Gemini 2.5 Pro for maximum context window and reasoning
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-pro", 
    generationConfig: { responseMimeType: "application/json" } 
});

const SYSTEM_PROMPT = `
You are the **Editor-in-Chief** of a Tier-1 Crypto & Finance Publication (like Bloomberg Crypto or CoinDesk).
Your goal is to take raw news signals and transform them into **authoritative, deep-dive news reports** that dominate Google News rankings.

### 🛡️ 2025 GOOGLE COMPLIANCE & E-E-A-T RULES (STRICT)
1. **Zero Fluff:** Every sentence must add value. No "In this article we will discuss..." intros. Dive straight into the news.
2. **Expert Analysis:** Do not just report *what* happened. Explain *why* it matters, the *on-chain implications*, and the *macro-economic context*.
3. **Neutrality:** Maintain a detached, professional tone. No "Exciting news!" or "To the moon!". Use "Significant development" or "Market movement."
4. **Originality:** Structure the narrative uniquely. Do not mimic the source text structure. Use the "Inverted Pyramid" style (Most important facts first).

### 📝 CONTENT STRUCTURE (HTML)
The 'article_html' field must be a single string containing ONLY these tags: <h1>, <p>, <h2>, <h3>, <ul>, <li>, <strong>.
**Do NOT use <html>, <body>, or Markdown blocks.**

**Required Article Architecture:**
1. **<h1>Headline</h1>** (Matches JSON headline)
2. **<p><strong>[DATELINE]</strong> — [Lead Paragraph: 50-60 words summarizing the 5 Ws (Who, what, where, when, why). Must contain Primary Keyword.]</p>**
3. **<h2>Market Context & Background</h2>** (2-3 paragraphs. What led to this? Historical price action? Previous regulatory stance?)
4. **<h2>Key Details & Data</h2>** (The core facts. Use specific numbers. "The token rose 5% to $3.20...", "Trading volume spiked $500M...")
   - *Include a <ul> bullet list of 3-5 hard facts.*
5. **<h2>Expert Analysis & Industry Impact</h2>** (Why does this matter for the broader market? What are analysts saying? Use synthetic but realistic analyst viewpoints if quotes are missing.)
6. **<h2>What's Next?</h2>** (Forward-looking statements. Upcoming dates, resistance levels, or regulatory deadlines.)
7. **<h2>Frequently Asked Questions (FAQs)</h2>** (Crucial for SEO snippets. Add 3 relevant Q&As based on the article topic.)

### 🤖 OUTPUT SCHEMA (JSON)
Return ONLY this JSON object. Ensure strict validity.
{
  "headline": "String (SEO-optimized, 60-70 chars, punchy, contains Focus Keyword)",
  "slug": "String (kebab-case, url-friendly)",
  "meta_description": "String (140-155 chars, optimized for CTR, includes Focus Keyword)",
  "tags": ["String", "String", "String", "String", "String"],
  "article_html": "String (The full HTML content following the structure above)",
  "originality_score": Number (0.90-1.0),
  "confidence": Number (0.0-1.0)
}
`;

export const generateArticle = async (cleanedNewsData) => {
    try {
        const userPrompt = `
        ### SOURCE MATERIAL
        **Title:** ${cleanedNewsData.title}
        **Category/Keyword:** ${cleanedNewsData.category.name}
        **Raw Summary:** ${cleanedNewsData.summary}
        **Full Context/Body:** ${JSON.stringify(cleanedNewsData.content)}
        **Source URL:** ${cleanedNewsData.sourceUrl}
        **Published Date:** ${cleanedNewsData.publishedAt}

        ### TASK
        Write a **1000+ word definitive news report** based *only* on the facts provided above, but expanded with *contextual knowledge* of the crypto market (e.g., if Bitcoin drops, explain support levels; if SEC sues, explain the Howey Test).

        **Execution Order:**
        1. Analyze the input facts.
        2. Determine the "Angle" (Is this bullish, bearish, regulatory, or tech?).
        3. Write the Article (HTML) following the E-E-A-T structure.
        4. Generate SEO Metadata (Headline/Description).
        5. Return JSON.
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n" + userPrompt }] }]
        });

        const response = await result.response;
        const text = response.text();

        return JSON.parse(text);

    } catch (error) {
        console.error("❌ AI Generation Error:", error.message);
        // Robust Fallback (Short article is better than crash)
        return {
            headline: cleanedNewsData.title,
            slug: cleanedNewsData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            meta_description: cleanedNewsData.summary.substring(0, 150),
            article_html: `<h1>${cleanedNewsData.title}</h1><p><strong>${new Date().toLocaleDateString()}</strong> — ${cleanedNewsData.summary}</p><h2>Details</h2><p>${cleanedNewsData.content}</p><p><em>Market data is developing.</em></p>`,
            tags: [cleanedNewsData.category.name],
            originality_score: 0.5,
            confidence: 0.0
        };
    }
};
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use Gemini 2.5 Pro for maximum reasoning, depth, and instruction following
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-pro", 
    generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.3, // Reduced temperature for higher factuality
        topP: 0.85,
        topK: 40
    } 
});

const SYSTEM_PROMPT = `
You are the **Editor-in-Chief & Senior SEO Strategist** for a Tier-1 Financial Publication.
Your goal is to produce **definitive, authoritative coverage** that dominates Google News and Discover feeds.

### 1. THE "BRUTAL QUALITY" STANDARD (Non-Negotiable)
- **Depth & Density:** Content must be information-dense. No fluff. Every sentence must deliver value.
- **E-E-A-T Enforcement:** Demonstrate **Expertise** (use correct terminology), **Authority** (cite data), and **Trust** (acknowledge risks/counter-arguments).
- **Readability:** Target Flesch-Kincaid Grade 8-10. Simple sentence structures for complex ideas.
- **Active Voice:** "The SEC sued Binance" (Good) vs "Binance was sued by the SEC" (Bad).
- **No Robot-Speak:** Banned phrases: "In conclusion," "Delving into," "A testament to," "Game-changer," "Landscape."

### 2. SEO & SEMANTIC RICHNESS
- **LSI Keywords:** Naturally weave in Latent Semantic Indexing (LSI) terms related to the topic (e.g., if "Bitcoin", use "Satoshi," "Hashrate," "Digital Gold," "Resistance Level").
- **Entity Salience:** Bold the **first mention** of key entities (companies, tokens, people) using <strong> tag.
- **Snippet Optimization:** The first sentence of every paragraph should be punchy and stand alone.

### 3. REQUIRED HTML STRUCTURE (article_html)
Use ONLY these tags: <h1>, <p>, <h2>, <h3>, <ul>, <li>, <strong>, <blockquote>.
Do NOT use <html>, <body>, or Markdown.

**The Blueprint:**
1.  **Dateline:** <p><strong>NEW YORK, [Current Date]</strong> — [Lead Paragraph: Who, What, When, Where, Why + Primary Keyword in first 15 words].</p>
2.  **Executive Summary:** A <blockquote> section summarizing the "Alpha" or "Key Signal" for investors.
3.  **Market Context (H2):** Historical background, price action leading to this, or regulatory precedent.
4.  **Deep Dive (H2):** The core story. Use specific numbers (e.g. $4.2B, 15%). Explain *technical concepts* if they appear (e.g., "Short Squeeze").
5.  **Market Reaction (H3):** Price movement, liquidation data, or social sentiment.
6.  **The Contrarian View / Risks (H3):** What could go wrong? (Crucial for Trust).
7.  **Key Takeaways (H2):** <ul> list of 4-5 bullet points.
8.  **FAQ (H2):** 3 Questions people might search for regarding this topic.

### 4. OUTPUT SCHEMA (JSON)
{
  "headline": "String (60-75 chars, High CTR, Power Words included)",
  "slug": "String (kebab-case, keyword-rich)",
  "meta_description": "String (145-160 chars, includes primary keyword, 'teaser' style)",
  "tags": ["String", "String", "String", "String", "String"],
  "article_html": "String (The full HTML content)",
  "originality_score": Number (0.95-1.0),
  "confidence": Number (0.0-1.0)
}
`;

// Robust JSON Cleaner to prevent worker crashes
const cleanJsonOutput = (text) => {
    const clean = text.replace(/```json|```/g, '').trim();
    try {
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Fail. Raw text sample:", text.substring(0, 50));
        throw new Error("AI produced invalid JSON");
    }
};

export const generateArticle = async (cleanedNewsData) => {
    try {
        const userPrompt = `
        ### SOURCE INTEL
        **Headline Signal:** ${cleanedNewsData.title}
        **Category:** ${cleanedNewsData.category.name}
        **Raw Summary:** ${cleanedNewsData.summary}
        **Full Context:** ${JSON.stringify(cleanedNewsData.content)}
        **Source:** ${cleanedNewsData.sourceUrl}
        **Date:** ${cleanedNewsData.publishedAt}

        ### MISSION
        Write a **1200+ word investigative report** on this topic.
        - **Analyze** the implications for the ${cleanedNewsData.category.name} sector.
        - **Identify** 3-5 LSI keywords relevant to this specific story and use them.
        - **Explain** any jargon (e.g., if "ETF" is mentioned, briefly define its impact).
        - **Formatting:** Use a <blockquote> for the most important quote or stat.
        
        **GOAL:** Create the definitive resource on this news event that makes other articles look shallow.
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n" + userPrompt }] }]
        });

        const response = await result.response;
        const text = response.text();

        return cleanJsonOutput(text);

    } catch (error) {
        console.error("❌ AI Generation Error:", error.message);
        
        // Fail-safe fallback to keep the pipeline alive
        return {
            headline: cleanedNewsData.title,
            slug: cleanedNewsData.title.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-'),
            meta_description: cleanedNewsData.summary?.substring(0, 150) || "Developing market story.",
            article_html: `
                <h1>${cleanedNewsData.title}</h1>
                <p><strong>${new Date().toLocaleDateString()}</strong> — ${cleanedNewsData.summary}</p>
                <blockquote><strong>Quick Take:</strong> Market data is currently developing. Full analysis incoming.</blockquote>
                <h2>Details</h2>
                <p>${cleanedNewsData.content || "Data processing..."}</p>
                <h2>Key Takeaways</h2>
                <ul><li>Breaking news in the ${cleanedNewsData.category.name} sector.</li></ul>
            `,
            tags: [cleanedNewsData.category.name, "Breaking News"],
            originality_score: 0.5,
            confidence: 0.1 
        };
    }
};
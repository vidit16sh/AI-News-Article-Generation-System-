import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use Gemini 2.5 Pro for high-quality reasoning and writing
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-pro", 
    generationConfig: { responseMimeType: "application/json" } 
});

const SYSTEM_PROMPT = `
You are an expert AI news writer specializing in fast‑breaking crypto, finance, and tech updates.
Your job is to take clean, factual signals and transform them into Human‑readable, Neutral‑tone, SEO‑optimized, Google‑News‑friendly news articles.

### 1. STRUCTURE REQUIREMENTS (JSON Output)
Return a single JSON object with this exact schema:
{
  "headline": "String (Max 70 chars, factual, no clickbait)",
  "meta_description": "String (130-155 chars, includes main keyword)",
  "slug": "String (kebab-case url-friendly)",
  "tags": ["String", "String", "String"],
  "article_html": "String (HTML content)",
  "originality_score": Number (0.8-1.0),
  "confidence": Number (0.0-1.0)
}

### 2. ARTICLE_HTML CONTENT RULES
The 'article_html' field must be a single string containing standard HTML tags (<h1>, <p>, <h2>, <ul>, <li>, <strong>). 
Do NOT use <html>, <body>, or inline CSS.

**Internal Structure:**
1. **Headline (H1):** Matches JSON headline.
2. **Subheadline (P):** A single bold sentence summary (<strong>...</strong>).
3. **Dateline (P):** "Date — Lead paragraph..." (Time-stamped lead giving the main event).
4. **Market Context (H2 + P):** Why this news matters, market cap effects, industry implications.
5. **Key Details (H2 + P + UL):** 5–7 short paragraphs with facts, verified data, and market reaction. Include a bulleted list.
6. **What Happens Next (H2 + P):** Predicting likely next steps.
7. **Key Takeaways (H2 + UL):** 3–5 bullet points summarizing the event.
8. **Author (P):** "By AI News Desk" (or similar professional bio).

### 3. WRITING & SEO RULES (AP Style)
- **Tone:** Neutral, factual, newsroom style. No hype, no "🚀".
- **Length:** 500–700 words.
- **Keywords:** Maintain keyword density 1.5–2%. Use semantic variations (digital assets, blockchain sector).
- **Paragraphs:** Short (2–3 lines each).
- **Hallucinations:** STRICTLY FORBIDDEN. Use ONLY the provided input data. If a specific number/quote is missing, do not invent it.

### 4. INPUT DATA HANDLING
You will receive a JSON object with 'title', 'content', 'category', etc.
- Treat 'category' as the Primary Keyword.
- Derive Secondary Keywords from the content entities.
`;

export const generateArticle = async (cleanedNewsData) => {
    try {
        // Construct the User Prompt with the raw data
        const userPrompt = `
        WRITE AN ARTICLE BASED ON THIS SIGNAL:
        
        - **Primary Keyword:** ${cleanedNewsData.category.name}
        - **Headline Signal:** ${cleanedNewsData.title}
        - **Raw Summary:** ${cleanedNewsData.summary}
        - **Full Facts/Context:** ${JSON.stringify(cleanedNewsData.content)}
        - **Published At:** ${cleanedNewsData.publishedAt}
        - **Source URL:** ${cleanedNewsData.sourceUrl}

        **Instructions:**
        1. Write a full Google News-optimized article using the System Prompt rules.
        2. Ensure the Headline is < 70 chars and punchy.
        3. Include "Key Takeaways" at the end.
        4. Return ONLY valid JSON.
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n" + userPrompt }] }]
        });

        const response = await result.response;
        const text = response.text();

        return JSON.parse(text);

    } catch (error) {
        console.error("❌ AI Generation Error:", error.message);
        // Robust Fallback to prevent worker crash
        return {
            headline: cleanedNewsData.title,
            slug: cleanedNewsData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            meta_description: cleanedNewsData.summary.substring(0, 150),
            article_html: `<h1>${cleanedNewsData.title}</h1><p>${cleanedNewsData.summary}</p><p><em>Full details were not immediately available.</em></p>`,
            tags: [cleanedNewsData.category.name],
            originality_score: 0.5,
            confidence: 0.0
        };
    }
};
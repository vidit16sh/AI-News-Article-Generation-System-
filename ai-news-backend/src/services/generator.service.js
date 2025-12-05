import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use Gemini 2.5 Pro for maximum reasoning depth
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-pro", 
    generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.25, // Low temp for factual accuracy
        topP: 0.9,
        topK: 40
    } 
});

const SYSTEM_PROMPT = `
You are the **Editor-in-Chief & SEO Architect** for a Tier-1 Financial Publication.
Your task is to generate a **100% unique, experience-driven, and Google-compliant** news article.

### 1. 2025 GOOGLE COMPLIANCE RULES (Strict)
- **Word Count:** Aim for ~2000 words of high-value content.
- **Tone:** Neutral, journalistic, factual (Active Voice ≥ 90%).
- **Readability:** Flesch Reading Ease Score ≥ 60. Paragraphs ≤ 150 words.
- **E-E-A-T:** Integrate real-world context, expert references, and verify facts.
- **Structure:** Use transition words in ≥ 30% of sentences. Subheadings every 300 words.

### 2. SEO REQUIREMENTS
- **Focus Keyword:** Must appear in Title, First 100 words, Subheadings, and Conclusion.
- **LSI Keywords:** Use synonyms and related terms to prevent keyword stuffing.
- **Power Words:** Include at least one emotional/psychological trigger word in the headline.

### 3. CONTENT FORMAT (HTML)
The 'article_html' must use ONLY these tags: <h1>, <p>, <h2>, <h3>, <ul>, <li>, <strong>, <blockquote>, <table>.
**Architecture:**
1. **Headline (H1):** Matches JSON headline.
2. **Dateline:** <p><strong>[CITY], [Date]</strong> — [Lead Paragraph with Focus Keyword].</p>
3. **Executive Summary:** A <blockquote> with key takeaways.
4. **Market Context (H2):** Deep analysis of the background.
5. **Core Analysis (H2):** Detailed breakdown with data.
6. **Expert Opinion (H3):** Contrarian views or analyst sentiment.
7. **Impact Assessment (H2):** Real-world effects on the industry.
8. **Conclusion (H2):** Summary + Final thought.
9. **FAQs (H2):** 4-6 Questions & Answers.

### 4. OUTPUT SCHEMA (JSON)
Return ONLY this JSON object:
{
  "headline": "String (60-75 chars, optimized)",
  "slug": "String (kebab-case, 4-5 words)",
  "meta_description": "String (145-155 chars, includes focus keyword)",
  "tags": ["String"],
  "keywords": ["String"],
  "focus_keywords": "String (Primary keyword used)",
  "featured_image_alt": "String (SEO optimized alt text)",
  "article_html": "String (Full HTML content)",
  "confidence": Number (0.0-1.0)
}
`;

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
        ### SOURCE MATERIAL
        **Headline:** ${cleanedNewsData.title}
        **Category:** ${cleanedNewsData.category.name}
        **Raw Summary:** ${cleanedNewsData.summary}
        **Full Context:** ${JSON.stringify(cleanedNewsData.content)}
        **Source:** ${cleanedNewsData.sourceUrl}
        **Date:** ${cleanedNewsData.publishedAt}

        ### MISSION
        Write a definitive, deep-dive article (~2000 words) based on this data.
        - **Focus Keyword:** Derive the most important SEO keyword from the input.
        - **Depth:** Explain technical concepts (e.g., "Liquidity Crunch", "Layer-2 Scaling").
        - **Uniqueness:** Do not just summarize. Synthesize a new narrative using the Inverted Pyramid style.
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n" + userPrompt }] }]
        });

        const response = await result.response;
        const text = response.text();

        return cleanJsonOutput(text);

    } catch (error) {
        console.error("❌ AI Generation Error:", error.message);
        // Fallback
        return {
            headline: cleanedNewsData.title,
            slug: cleanedNewsData.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-'),
            meta_description: cleanedNewsData.summary?.substring(0, 150) || "Market update.",
            article_html: `<h1>${cleanedNewsData.title}</h1><p><strong>${new Date().toLocaleDateString()}</strong> — ${cleanedNewsData.summary}</p><h2>Details</h2><p>${cleanedNewsData.content || "Developing story."}</p>`,
            tags: [cleanedNewsData.category.name],
            keywords: [cleanedNewsData.category.name],
            confidence: 0.1 
        };
    }
};
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use a model that supports JSON response for reliability
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-pro", 
    generationConfig: { responseMimeType: "application/json" } 
});

// YOUR EXACT SYSTEM PROMPT
const SYSTEM_PROMPT = `
You are an expert AI news writer for a high-frequency news publisher. Your task is to convert CLEAN input signals into a Google-News-ready, SEO-optimized, fact-accurate, publishable article JSON. Follow these NON-NEGOTIABLE rules exactly.

1) ZERO HALLUCINATION:
- Use ONLY facts present in the input JSON. If a fact is not present, do NOT invent it.

2) OUTPUT JSON (exact fields & types):
Return exactly one JSON object with these keys:
{
  "headline": "",                // 55-70 chars, contains main_keyword
  "meta_description": "",        // 130-155 chars, includes main_keyword
  "tags": [],                    // 5-10 short tags
  "article_html": "",            // HTML string containing <h1>, <p>, <h2>, <ul> only.
  "slug": "",                    // kebab-case
  "news_jsonld": {},             // schema.org NewsArticle JSON-LD object
  "originality_score": 0.0,      // 0.0-1.0 estimate
  "confidence": 0.0              // 0.0-1.0
}

3) ARTICLE_HTML STRUCTURE:
<h1>Headline</h1>
<p>Lead: one paragraph that contains the main keyword in the first 140 characters.</p>
<h2>Market Context</h2>
<p>1–3 short paragraphs</p>
<h2>Key Details</h2>
<p>1–3 short paragraphs</p>
<ul><li>3–6 bullet facts</li></ul>
<h2>Why It Matters</h2>
<p>1 short paragraph</p>

4) SEO RULES:
- Include main_keyword exactly as provided in input in title + first paragraph + last paragraph.
- Headline length: 55–70 chars. No clickbait.
`;

const generateArticle = async (cleanedNewsData) => {
    try {
        // Construct the User Prompt dynamically
        const userPrompt = `
        Use the system instructions above. Here is the CLEAN input JSON from Model 1:

        {
          "clean_headline": "${cleanedNewsData.title}",
          "clean_summary": "${cleanedNewsData.summary}",
          "clean_body": ${JSON.stringify(cleanedNewsData.content)}, 
          "main_keyword": "${cleanedNewsData.category.name}",
          "source": "${cleanedNewsData.sourceUrl}",
          "published_at": "${cleanedNewsData.publishedAt}"
        }

        Base the article only on this data. Output the required JSON object only.
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n" + userPrompt }] }]
        });

        const response = await result.response;
        const text = response.text();

        return JSON.parse(text);

    } catch (error) {
        console.error("❌ AI Generation Error:", error.message);
        throw error;
    }
};

module.exports = { generateArticle };
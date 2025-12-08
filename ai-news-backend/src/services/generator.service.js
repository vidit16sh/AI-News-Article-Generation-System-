import OpenAI from "openai";

// 🔌 Connect to DeepSeek via OpenAI SDK
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// DeepSeek V3 Configuration
const MODEL_CONFIG = {
    model: "deepseek-chat", 
    temperature: 0.2,       // Low temp for factual accuracy
    max_tokens: 8192,
    top_p: 0.9,
    response_format: { type: "json_object" } 
};

// 🛡️ MERGED PROMPT: Your Original SEO Architecture + New "Brutal Audit" Fixes
const SYSTEM_PROMPT = `
You are the **Editor-in-Chief & SEO Architect** for a Tier-1 Financial Publication.
Your task is to generate a **100% unique, experience-driven, and Google-compliant** news article.

### 1. 2025 GOOGLE COMPLIANCE RULES (Strict)
- **Word Count:** Aim for ~1000 words of high-value content.
- **Tone:** Neutral, journalistic, factual (Active Voice ≥ 90%).
- **Readability:** **Grade Level 6-8** (Flesch Reading Ease ≥ 60). Paragraphs ≤ 150 words.
- **Forbidden Words:** Do NOT use: "delve", "tapestry", "landscape", "testament", "burgeoning", "underscores".
- **E-E-A-T:** Integrate real-world context, expert references, and verify facts.
- **Structure:** Use transition words in ≥ 30% of sentences. Subheadings every 300 words.

### 2. SEO REQUIREMENTS
- **Focus Keyword:** Must appear in Title, First 100 words, Subheadings, and Conclusion.
- **LSI Keywords:** Use synonyms and related terms to prevent keyword stuffing.
- **Power Words:** Include at least one emotional/psychological trigger word in the headline.

### 3. CITATION & LINKING (MANDATORY for SEO)
- **Source Link:** You MUST include an HTML link to the provided **Source URL** (e.g., <a href="...">according to the report</a>).
- **Internal Links:** Link mentions of the specific Category to the provided **Category Slug**.

### 4. CONTENT FORMAT (HTML)
The 'article_html' must use ONLY these tags: <h1>, <p>, <h2>, <h3>, <ul>, <li>, <strong>, <blockquote>, <table>, <a>.
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

### 5. OUTPUT SCHEMA (JSON)
Return ONLY this JSON object:
{
  "headline": "String (60-75 chars, optimized)",
  "slug": "String (kebab-case, 4-5 words)",
  "meta_description": "String (145-155 chars, includes focus keyword)",
  "tags": ["String"],
  "keywords": ["String"],
  "focus_keywords": "String (Primary keyword used)",
  "featured_image_alt": "String (SEO optimized alt text)",
  "article_html": "String (Full HTML content with links)",
  "confidence": Number (0.0-1.0)
}
`;

// 🧹 JSON CLEANER
const cleanJsonOutput = (text) => {
    try {
        let clean = text.replace(/```json/g, '').replace(/```/g, '');
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1) {
            clean = clean.substring(firstOpen, lastClose + 1);
        }
        
        return JSON.parse(clean);
    } catch (e) {
        console.error("❌ JSON Repair Failed Snippet:", text.substring(0, 100));
        throw new Error("AI produced invalid JSON");
    }
};

// 🚑 SMART MANUAL FALLBACK
const generateFallbackArticle = (data) => {
    console.log("⚠️ Triggering Smart Manual Fallback...");
    
    const safeDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const paragraphs = data.content ? data.content.split('\n').filter(p => p.length > 50) : [];
    const categoryName = data.category?.name || "Crypto";
    
    let htmlContent = `
        <h1>${data.title}</h1>
        <p><strong>NEW YORK, ${safeDate}</strong> — ${data.summary || "Breaking news in the digital asset sector."}</p>
        
        <blockquote>
            <strong>Key Takeaways:</strong>
            <ul>
                <li>Major development in the ${categoryName} market.</li>
                <li>Analysts are monitoring the situation closely.</li>
                <li>Full details and context provided below.</li>
            </ul>
        </blockquote>

        <h2>Market Context</h2>
        <p>This development comes amid a broader trend of volatility and innovation within the <strong>${categoryName}</strong> ecosystem.</p>
        
        <h2>Core Analysis</h2>
    `;

    // Inject raw paragraphs
    if (paragraphs.length > 0) {
        paragraphs.slice(0, 4).forEach(p => {
            htmlContent += `<p>${p}</p>`;
        });
    }

    // Add Attribution Link
    htmlContent += `
        <h2>Source & References</h2>
        <p>This report references data originally published by <strong><a href="${data.sourceUrl}" target="_blank" rel="nofollow">Source</a></strong>.</p>
    `;

    return {
        headline: data.title,
        slug: data.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-'),
        meta_description: data.summary?.substring(0, 150) || `Latest updates on ${data.title}.`,
        article_html: htmlContent,
        tags: [categoryName, "News"],
        keywords: [categoryName, "Cryptocurrency"],
        focus_keywords: categoryName,
        featured_image_alt: `News about ${data.title}`,
        confidence: 0.5 
    };
};

export const generateArticle = async (cleanedNewsData) => {
    // 🔄 RETRY LOGIC
    const MAX_RETRIES = 2;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const categorySlug = cleanedNewsData.category?.name?.toLowerCase().replace(/\s+/g, '-') || "crypto";
            
            const userPrompt = `
            ### SOURCE MATERIAL
            **Headline:** ${cleanedNewsData.title}
            **Category:** ${cleanedNewsData.category.name}
            **Category Slug:** /category/${categorySlug}
            **Source URL:** ${cleanedNewsData.sourceUrl}
            **Date:** ${cleanedNewsData.publishedAt}
            **Raw Summary:** ${cleanedNewsData.summary}
            **Full Context:** ${JSON.stringify(cleanedNewsData.content)}

            ### MISSION
            Write a definitive, deep-dive article (~1000 words) using the **Inverted Pyramid style**.
            - **Focus Keyword:** Derive the most important SEO keyword from the input.
            - **Depth:** Explain technical concepts simplistically.
            - **Requirement:** Link to the Source URL provided above.
            `;

            // 🚀 Call DeepSeek
            const completion = await openai.chat.completions.create({
                model: MODEL_CONFIG.model,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt }
                ],
                temperature: MODEL_CONFIG.temperature,
                max_tokens: MODEL_CONFIG.max_tokens,
                top_p: MODEL_CONFIG.top_p,
                response_format: MODEL_CONFIG.response_format
            });

            const text = completion.choices[0].message.content;
            
            // 🛡️ PARSE
            const json = cleanJsonOutput(text);

            // Explicit Check
            if (!json || typeof json !== 'object') {
                throw new Error("Parsed JSON is null or invalid.");
            }

            return json; 

        } catch (error) {
            console.error(`❌ Attempt ${attempt} Failed:`, error.message);
            
            if (attempt < MAX_RETRIES) {
                await new Promise(res => setTimeout(res, 2000));
            }
        }
    }

    // 🚨 EMERGENCY EXIT
    return generateFallbackArticle(cleanedNewsData);
};
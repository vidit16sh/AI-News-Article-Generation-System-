import OpenAI from "openai";

// 🔌 Connect to DeepSeek via OpenAI SDK
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// DeepSeek V3 Configuration
const MODEL_CONFIG = {
    model: "deepseek-chat", 
    temperature: 0.1,       // Low temp is CRITICAL for following your strict formatting rules
    max_tokens: 8192,
    top_p: 0.9,
    response_format: { type: "json_object" } 
};

// 🛡️ OPTIMIZED SYSTEM PROMPT (Google News Standard - Efficient Version)
const SYSTEM_PROMPT = `
You are the Editor-in-Chief of a top-tier crypto news organization approved in Google News.  
Your goal: Generate a **100% original, factual, SEO-optimized** article in clear Grade 6–8 English.  
Output must be **STRICT JSON ONLY**.

============================================================
1. MANDATORY GOOGLE NEWS RULES
============================================================
- **Dateline:** Paragraph 1 MUST start: <p><strong>[CITY], [Month] [Day], [Year]</strong> — ...</p>
- **Accuracy:** Use ONLY facts from the source. No hallucinations. Attribute all claims ("According to...").
- **Citations:** Include EXACTLY ONE HTML link to the Source URL provided.
- **Tone:** Neutral, journalistic, authoritative. Zero hype.
- **Forbidden Words:** NEVER use: "delve", "tapestry", "landscape", "testament", "burgeoning", "underscores", "moreover", "furthermore", "merely", "amidst", "in essence", "pivotal", "unveils".

============================================================
2. CONTENT & STRUCTURE
============================================================
**Length:** 500–850 words.  
**Structure (HTML Tags Only: h1, p, h2, h3, ul, li, blockquote, a):**
1. <h1>Headline</h1> **(75-80 chars, includes Focus Keyword)**
2. Dateline Paragraph (35-55 words)
3. Executive Summary (<blockquote><ul><li>3 bullets</li></ul></blockquote>)
4. <h2>What Happened</h2> (Simple explanation)
5. <h2>Why It Matters</h2> (Impact analysis)
6. <h2>By The Numbers</h2> (Data/Stats in a list/table)
7. <h3>What Experts Say</h3> (Quotes or attributed sentiment)
8. <h2>What’s Next</h2> (Future outlook/dates)
9. <h2>FAQs</h2> (4-6 Q&A)
10. Conclusion (Contains Focus Keyword)

============================================================
3. READABILITY (Grade 6-8)
============================================================
- **Simple:** Write for a smart 12-year-old.
- **Short:** Max 15 words per sentence. Max 3 lines per paragraph.
- **Active:** "Bitcoin rose 5%" (Not "Bitcoin experienced a rise").

============================================================
4. SEO REQUIREMENTS
============================================================
- **VERBATIM RULE:** The Focus Keyword must appear in the Headline **EXACTLY** as written. Do not change tense (e.g., if keyword is "Listing", do NOT write "Lists").
- **Focus Keyword:** In H1, First 100 words, Last paragraph, Meta Description.
- **Slug:** 4-5 words, kebab-case.
- **Meta Description:** <155 chars, compelling.

============================================================
5. JSON OUTPUT SCHEMA
============================================================
{
  "headline": "String",
  "slug": "String",
  "meta_description": "String",
  "tags": ["String"],
  "keywords": ["String"],
  "focus_keywords": "String",
  "featured_image_alt": "String",
  "article_html": "String",
  "confidence": Number
}
`;

// 🧹 ROBUST JSON CLEANER
const cleanJsonOutput = (text) => {
    try {
        let clean = text.replace(/```json/g, '').replace(/```/g, '');
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1) {
            clean = clean.substring(firstOpen, lastClose + 1);
        }
        clean = clean.replace(/<br\s*\/?>/gi, "");
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
    const paragraphs = data.content ? data.content.split('\n').filter(p => p.length > 20 && p.length < 200) : [];
    const categoryName = data.category?.name || "Crypto";
    
    let htmlContent = `
        <h1>${data.title}</h1>
        <p><strong>NEW YORK, ${safeDate}</strong> — ${data.summary || "Here is the latest update."}</p>
        
        <blockquote>
            <ul>
                <li>Breaking news in the ${categoryName} sector.</li>
                <li>Analysts are monitoring the situation closely.</li>
                <li>Full details and context provided below.</li>
            </ul>
        </blockquote>

        <h2>What Happened</h2>
        <p>There is a new development regarding <strong>${data.title}</strong>. This is important for traders and investors in the ${categoryName} space.</p>
        
        <h2>The Details</h2>
    `;

    if (paragraphs.length > 0) {
        paragraphs.slice(0, 4).forEach(p => {
            htmlContent += `<p>${p}</p>`;
        });
    }

    htmlContent += `
        <h2>Source</h2>
        <p>This story relies on data from <strong><a href="${data.sourceUrl}" target="_blank" rel="nofollow">this report</a></strong>.</p>
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
    const MAX_RETRIES = 2;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const categorySlug = cleanedNewsData.category?.name?.toLowerCase().replace(/\s+/g, '-') || "crypto";
            const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            const userPrompt = `
            ### INPUT SOURCE DATA
            **Headline:** ${cleanedNewsData.title}
            **Category:** ${cleanedNewsData.category.name}
            **Category Slug (Use for linking):** /category/${categorySlug}
            **Source URL (Use for citation):** ${cleanedNewsData.sourceUrl}
            **Date (Use for dateline):** ${dateStr}
            **Raw Summary:** ${cleanedNewsData.summary}
            **Full Context:** ${JSON.stringify(cleanedNewsData.content)}

            ### INSTRUCTION
            Write the article following ALL strict rules in the System Prompt.
            
            ### 🛡️ FINAL CHECKS:
            1. **Headline:** MUST be between 60-75 characters. (Current source is ${cleanedNewsData.title.length} chars).
            2. **Keyword:** The 'focus_keywords' you choose MUST appear VERBATIM in the 'headline'.
            3. **Dateline:** Start with: <p><strong>NEW YORK, ${dateStr}</strong> — ...</p>
            `;

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
            const json = cleanJsonOutput(text);

            if (!json || typeof json !== 'object') {
                throw new Error("Parsed JSON is null or invalid.");
            }

            // Self-Healing: Guarantee the Source Link exists
            if (!json.article_html.includes('href="http') && !json.article_html.includes("href='http")) {
                json.article_html += `<p>Data source: <a href="${cleanedNewsData.sourceUrl}" target="_blank" rel="nofollow">Read Original Report</a></p>`;
            }

            return json; 

        } catch (error) {
            console.error(`❌ Attempt ${attempt} Failed:`, error.message);
            
            if (attempt < MAX_RETRIES) {
                await new Promise(res => setTimeout(res, 2000));
            }
        }
    }

    return generateFallbackArticle(cleanedNewsData);
};
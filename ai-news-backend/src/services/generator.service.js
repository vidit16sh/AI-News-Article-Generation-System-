import OpenAI from "openai";

// 🔌 Connect to DeepSeek via OpenAI SDK
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// DeepSeek V3 Configuration
const MODEL_CONFIG = {
    model: "deepseek-chat", 
    temperature: 0.1,       // Low temp for strict adherence to facts & formatting
    max_tokens: 8192,
    top_p: 0.9,
    response_format: { type: "json_object" } 
};

// 🛡️ NEW SYSTEM PROMPT (Google News Standard)
const SYSTEM_PROMPT = `
You are the Editor-in-Chief of a top-tier crypto news organization that is approved in Google News. You create 100% original, deeply factual, SEO-optimized news articles written in simple Grade 6–8 English. The tone is authoritative, neutral, and journalistic. Maintain strict Google Search and Google News editorial standards.

============================================================
1. CONTENT QUALITY RULES (GOOGLE NEWS + GOOGLE HELPFUL CONTENT)
============================================================
- Use short sentences (max 15 words).
- Use simple words but keep the information detailed and specific.
- Every section must contain at least one number, date, percentage, named entity, or a direct quote.
- Avoid filler or vague statements. Never say: “This could be important,” “Only time will tell,” “The future is uncertain.”
- No hype and no promotional tone.
- All claims must be supported by the provided source information. Never hallucinate.
- You must include one HTML link to the Source URL provided in the user prompt.

Forbidden words: “delve”, “tapestry”, “landscape”, “testament”, “burgeoning”, “underscores”, “moreover”, “furthermore”, “merely”, “amidst”, “in essence”.

============================================================
2. GOOGLE E-A-T ENHANCERS (MANDATORY)
============================================================
You must raise Expertise, Authoritativeness, and Trustworthiness using:
- Direct attribution (“according to data from…”, “the report states…”, “analysts at…”).
- Accurate facts from the source.
- At least one expert quote inside “What Experts Say”.
- A clear explanation of why the news matters to investors or regular readers.
- Strong sourcing through an HTML link to the Source URL in the article body.
- Transparent dateline and city.
- Use clear data tables and bullets for factual clarity.

Never fabricate experts, organizations, or quotes.

============================================================
3. SEO RULES (MANDATORY FOR DISCOVER + NEWS)
============================================================
- Use the focus keyword:
  - In the headline (H1)
  - In the first 100 words
  - In the final paragraph
- Title length: 60–75 characters
- Meta description length: under 155 characters
- Slug: 4–5 words in kebab-case
- Include semantic keyword variants naturally
- All mentions of Category must be linked to the provided Category Slug
- Provide an SEO-optimized featured_image_alt describing the topic

============================================================
4. ARTICLE LENGTH RULES
============================================================
Total HTML word count target: 500–750 words
Section lengths:
- Lead paragraph: 35–55 words
- Executive summary: 3 bullets, each 12–20 words
- Each H2 section: 100–140 words
- Expert quotes: 1–2 quotes, each under 20 words
- FAQs: 4–6 questions, each answer 20–30 words

Never exceed 850 words. Never go below 450 words.

============================================================
5. ARTICLE STRUCTURE (MANDATORY)
============================================================
Use only these HTML tags: <h1>, <p>, <h2>, <h3>, <ul>, <li>, <strong>, <blockquote>, <table>, <a>.

Required structure:
1. <h1> SEO headline using the focus keyword
2. Dateline:
   <p><strong>[CITY], [Date]</strong> — Lead paragraph.</p>
3. Executive Summary as:
   <blockquote><ul><li>fact bullet 1</li>…</ul></blockquote>
4. <h2>What Happened</h2>
5. <h2>Why It Matters</h2>
6. <h2>By The Numbers</h2> (Use table or bullets)
7. <h3>What Experts Say</h3> (1–2 quoted lines)
8. <h2>What’s Next</h2> (Include dates, timelines, price targets, or upcoming events)
9. <h2>FAQs</h2> (4–6 Q&A entries)

============================================================
6. READABILITY RULES
============================================================
- Active voice 95% of the time.
- Paragraphs must be short (max 3 lines each).
- Avoid jargon unless explained in one simple sentence.

============================================================
7. JSON OUTPUT SCHEMA (DO NOT BREAK FORMAT)
============================================================
Return ONLY this JSON object, nothing else:

{
  "headline": "String (60-75 chars, optimized)",
  "slug": "String (kebab-case, 4-5 words)",
  "meta_description": "String (<155 chars, includes focus keyword)",
  "tags": ["String"],
  "keywords": ["String"],
  "focus_keywords": "String",
  "featured_image_alt": "String",
  "article_html": "String (Full HTML content)",
  "confidence": Number (0.0-1.0)
}

============================================================
8. CRITICAL OUTPUT RULES
============================================================
- Never include markdown or code blocks.
- Never output explanations.
- Never break JSON format.
- Never invent data.
- Use only facts found in the source material.
- Keep structure clean and consistent across all outputs.

You are a strict editor. Write clean, factual, authoritative news articles that fit Google News standards.
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
            Ensure the Dateline is: <p><strong>CITY, ${dateStr}</strong> — ...</p>
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

            // Self-Healing: Double check link exists
            if (!json.article_html.includes('href="http') && !json.article_html.includes("href='http")) {
                json.article_html += `<p>Source: <a href="${cleanedNewsData.sourceUrl}">Read Original</a></p>`;
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
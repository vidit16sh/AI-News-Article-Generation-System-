import OpenAI from "openai";

// 🔌 Connect to DeepSeek via OpenAI SDK
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// DeepSeek V3 Configuration
const MODEL_CONFIG = {
  model: "deepseek-chat",
  temperature: 0.1, // Low temp is CRITICAL for following strict formatting rules
  max_tokens: 8192,
  top_p: 0.9,
  response_format: { type: "json_object" },
};

const PROMPT_VARIANTS = [
  "Style Mode: BREAKING NEWS. Short, punchy sentences. Data-first. Urgent tone. Use fragments for speed.",
  "Style Mode: DEEP DIVE. Connect cause and effect. Use transitions like 'Consequently' and 'Underlying this trend'. Focus on the 'Why'.",
  "Style Mode: MARKET CONTEXT. Focus heavily on historical comparison (e.g., 'Similar to the 2021 correction').",
  "Style Mode: SKEPTICAL ANALYSIS. Question the official narrative. Look for contradictions in the data. Use a critical voice."
];
const FORBIDDEN_WORDS = [
  "delve", "tapestry", "landscape", "underscores", "pivotal", "crucial", "in conclusion", 
  "realm", "bustling", "burgeoning", "testament", "moreover", "furthermore", "rapidly evolving", 
  "ever-changing", "dynamic world", "latest updates", "game-changer", "unleash", "harnessing", 
  "beacon", "dive deep", "poised to", "seamlessly", "complex world of"
];

// 🧹 ROBUST JSON CLEANER
const cleanJsonOutput = (text) => {
  try {
    let clean = text.replace(/```json/g, "").replace(/```/g, "");
    const firstOpen = clean.indexOf("{");
    const lastClose = clean.lastIndexOf("}");

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

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const toPlainText = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>\-\[\]\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const ensureHtmlContent = (rawContent = "") => {
  const source = String(rawContent || "").trim();
  if (!source) return "";

  if (/<(h2|h3|p|ul|ol|li|table|section|div)\b/i.test(source)) {
    return source;
  }

  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const out = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith("### ")) {
      closeList();
      out.push(`<h3>${line.slice(4).trim()}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      out.push(`<h2>${line.slice(3).trim()}</h2>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${line.replace(/^[-*]\s+/, "").trim()}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${line}</p>`);
  }

  closeList();
  return out.join("\n");
};

const auditAndFixArticle = (json, sourceUrl) => {
  let content = ensureHtmlContent(json.content || json.article_html || "");
  let score = 100;

  const hasSummary = content.includes('class="executive-summary"');
  const hasFAQ = content.includes('class="faq-section"');
  const hasSources = content.includes('class="verified-sources"');

  if (hasSummary && hasFAQ && hasSources) {
    score += 10;
  } else {
    score -= 15;
  }

  FORBIDDEN_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    if (regex.test(content)) {
      content = content.replace(regex, " ");
      score -= 5;
    }
  });

  const wordCount = toPlainText(content).split(/\s+/).filter(Boolean).length;
  if (wordCount < 1200) {
    throw new Error(`Article too short: ${wordCount} words. Institutional pieces require depth.`);
  }

  if (!hasSources) {
    const sourceNote = `
      <div class="verified-sources" style="margin-top: 30px; padding: 20px; border: 1px dashed #cbd5e1; background: #fdfdfd; font-size: 0.85rem;">
        <strong>Source Note:</strong> Factual reporting in this investigative piece is sourced from
        <a href="${sourceUrl}" target="_blank" rel="nofollow" style="color: #2563eb; text-decoration: underline;">original market reports</a>.
        Analysis and technical forecasting provided by CoinMarketBuzz Intelligence Desk.
      </div>
    `;
    content += sourceNote;
  }

  if (json.headline) {
    json.headline = json.headline.replace(/\[.*?\]/g, "").trim();
  }

  const normalizedHeadline = (json.headline || "CoinMarketBuzz Investigative Report").trim();
  const plain = toPlainText(content);
  const excerpt = (json.excerpt || plain.slice(0, 160)).trim().slice(0, 160);
  const seoTitle = (json.seoTitle || normalizedHeadline).trim();
  const seoDescription = (json.seoDescription || excerpt || normalizedHeadline).trim().slice(0, 160);

  json.headline = normalizedHeadline;
  json.content = content;
  json.excerpt = excerpt;
  json.seoTitle = seoTitle;
  json.seoDescription = seoDescription;

  // Backward-compatible fields consumed by worker/storage pipeline.
  json.article_html = content;
  json.meta_description = seoDescription;
  json.slug = json.slug || slugify(normalizedHeadline);
  json.tags = Array.isArray(json.tags) ? json.tags : [];
  json.keywords = Array.isArray(json.keywords) ? json.keywords : [];
  json.focus_keywords = json.focus_keywords || "Crypto News";
  json.confidence = score / 100;
  return json;
};
// 🚑 SMART MANUAL FALLBACK
const generateFallbackArticle = (data) => {
  console.log("⚠️ Triggering Safe Mode Fallback...");
  const safeDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const categoryName = data.category?.name || "Crypto";
  const summaryText = data.summary || `Latest updates on ${data.title}.`;
  const fallbackContent = `
        <h1>${data.title}</h1>
        <p><strong>VADODARA, ${safeDate}</strong> — ${summaryText}</p>
        <blockquote><ul><li>Developing Story: Details are still emerging.</li><li>Category: ${categoryName} Market Update.</li></ul></blockquote>
        <h2>Market Update</h2>
        <p>We are tracking a developing story regarding <strong>${data.title}</strong>. Data indicates significant activity in the ${categoryName} sector.</p>
        <p>This report relies on data from <strong><a href="${data.sourceUrl}" target="_blank" rel="nofollow">the original report</a></strong>. CoinMarketBuzz analysts are reviewing the details and will update this analysis shortly.</p>
    `;

  return {
    headline: data.title,
    content: fallbackContent,
    excerpt: summaryText.slice(0, 160),
    seoTitle: data.title,
    seoDescription: summaryText.slice(0, 160),
    slug: slugify(data.title),
    meta_description: summaryText.slice(0, 160),
    article_html: fallbackContent,
    tags: [categoryName, "Market Brief"],
    keywords: [categoryName, "Crypto News"],
    focus_keywords: categoryName,
    status: "WEAK",
    confidence: 0.1,
  };
};

// 🚀 MAIN GENERATOR FUNCTION
export const generateArticle = async (cleanedNewsData, marketData = null, recentArticles = [], authorProfile = null) => {
  const MAX_RETRIES = 2;

  // 1. Prepare Persona
  const selectedPersonaKey = authorProfile?.personaKey || "THE_ANALYST";  
  let selectedStyle = PROMPT_VARIANTS[Math.floor(Math.random() * PROMPT_VARIANTS.length)];
  if (selectedPersonaKey === "THE_INSIDER") {
      selectedStyle = "Style Mode: BREAKING NEWS. Short, punchy sentences. Data-first.";
  }
 
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  // 2. Build Internal Link Strategy
  const internalLinkInstructions = recentArticles.length > 0 
    ? `\n### 🔗 LINKING STRATEGY (STRICT): 
       - You have the following related articles: ${recentArticles.map(l => `"${l.headline}" (URL: /news/${l.slug})`).join(", ")}.
       - RULE: ONLY insert these links if they are *contextually relevant* to the specific paragraph.
       - RULE: DO NOT force a link about "Spain Regulation" into a paragraph about "US Jobs". 
       - RULE: If they don't fit naturally, add a "Related Developments" list at the end of the "Market Context" section.
       - RULE: Do NOT use the exact headline as the anchor text. Use natural phrasing (e.g., "Amid recent regulatory shifts in Spain...").`
    : ""; 
  
  // 🛡️ ENHANCED SYSTEM PROMPT
      const systemPrompt = `
### ROLE: LEAD CRYPTO INVESTIGATIVE JOURNALIST & SEO ARCHITECT
You are the lead editor at CoinMarketBuzz. Produce a definitive investigative crypto report that is factual, skeptical, and publication-ready.

### OBJECTIVE
Transform fragmented multi-source inputs into a **substantive 2,000-word report** that improves search performance and investor decision quality.

### INPUT DATA PACKAGE
You will receive:
1. **THE LEAD**: Breaking brief from CoinNess.
2. **THE EVIDENCE**: 2-3 scraped secondary full texts (CoinTelegraph, etc.).
3. **THE PROOF**: CryptoPanic metadata (including \`sentiment\`, \`importance\`, and related fields).
4. **THE CONTEXT**: CoinGecko market stats.

### NON-NEGOTIABLE FACT RULES
- Use only facts present in the input package.
- If a detail is missing, write: \`Not provided in source data\`.
- Do not invent quotes, numbers, timestamps, or named sources.
- If sources conflict, explicitly label conflict and present both claims with attribution.

### LENGTH ENFORCEMENT (STRICT)
- Target: **1,900-2,150 words** of body content.
- Minimum per section must be respected.
- No short summaries replacing full sections.
- Every section must include concrete facts, attribution, and analysis.

### CONTENT BLUEPRINT (MANDATORY)
1. **H2: The Hook** (150-220 words)
Immediate breaking-event reporting: who/what/when/where.
2. **H2: Technical Deep-Dive** (550-700 words)
Explain mechanism, protocol architecture, or regulatory mechanics.
3. **H2: Data Analysis & Proof** (350-500 words)
Integrate CoinGecko + CryptoPanic metadata with explicit references.
4. **H2: Counter-Narrative & Source Conflicts** (350-500 words)
Compare source claims, identify contradictions, explain reliability gaps.
5. **H2: 7-Day Outlook & Scenarios** (400-520 words)
Provide **3 scenarios** (bull/base/bear), each data-backed and conditional.
6. **H3: Methodology & Source Reliability Notes** (120-180 words)
Briefly explain how conflicting evidence was weighted.

### SOURCE SYNTHESIS METHOD (MANDATORY)
- Build an internal comparison across sources:
  - Agreement points
  - Contradictions
  - Missing evidence
  - Which claim is better supported and why
- Use attribution phrases: \`Source A reports...\`, \`Source B disputes...\`
- If unresolved, state \`Conflict remains unresolved with available evidence.\`

### E-E-A-T OPTIMIZATION
Write like an experienced financial investigations editor:
- Use precise market structure and risk language.
- Distinguish observed facts vs inference.
- Include "what would invalidate this view" in scenario analysis.
- Avoid hype, certainty language, and promotional tone.

### METADATA INTEGRATION (STRICT)
- Use \`sentiment\` and \`importance\` directly in narrative.
- Include at least 3 explicit metadata-driven statements, e.g.:
  - \`CryptoPanic sentiment is X, but price structure indicates Y.\`
  - \`Importance score suggests event priority is X relative to market breadth.\`
- If metadata is absent, state that explicitly and proceed conservatively.

### SEO & STRUCTURE RULES
- Use only **H2/H3** headings.
- Include slug-derived keywords naturally in headings and body.
- Maintain readable investigative flow; avoid keyword stuffing.
- Keep paragraphs concise and information-dense.

### OUTPUT FORMAT (STRICT JSON ONLY)
Return **only** a valid JSON object.
No markdown fences. No commentary before/after JSON. No trailing commas. No extra keys. Content must be valid HTML using only h2, h3, p, ul, li, blockquote, table, section, and div.

Schema:
{
  "headline": "String",
  "content": "HTML String",
  "excerpt": "String (max 160 chars)",
  "seoTitle": "String",
  "seoDescription": "String"
}

### JSON SAFETY RULES FOR NEXT.JS 16
- Must parse with \`JSON.parse\` without cleanup.
- Escape internal quotes correctly.
- Use \`\\n\` for line breaks inside strings.
- Ensure all required keys are present and non-empty.
- If constrained by missing data, still return valid schema with explicit uncertainty language in \`content\`.
`;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const categorySlug = cleanedNewsData.category?.slug?.toLowerCase() || "crypto";

      // 🧠 USER PROMPT: Injecting Data + Context
      const userPrompt = `
            ### INPUT SOURCE DATA
            **Headline:** ${cleanedNewsData.title}
            **Category:** ${cleanedNewsData.category?.name || "Crypto"}
            **Category Slug:** /news/category/${categorySlug}
            **Source URL:** ${cleanedNewsData.sourceUrl}
            **Date:** ${dateStr}
            **Raw Summary:** ${cleanedNewsData.summary}
            **Full Context:** ${JSON.stringify(cleanedNewsData.content || "").substring(0, 6000)}
            
            ${marketData ? `### 📊 LIVE MARKET DATA (Inject this into the Data Snapshot Table!):\n${marketData}\n(MANDATORY: Integrate Fear & Greed / Price Stats)` : ""} 
            
            ${internalLinkInstructions}

            **STYLE MODE:** ${selectedStyle} 

            ### FINAL CHECKS:
            1. **Word Count:** Ensure content is 1,900-2,150 words.
            2. **Schema:** Return ONLY this JSON: headline, content, excerpt, seoTitle, seoDescription.
            3. **No Extra Keys:** Do not include fields outside the required schema.
            4. **JSON Validity:** Output must parse directly with JSON.parse().
            `;

      const completion = await openai.chat.completions.create({
        model: MODEL_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: MODEL_CONFIG.temperature,
        max_tokens: MODEL_CONFIG.max_tokens,
        top_p: MODEL_CONFIG.top_p,
        response_format: MODEL_CONFIG.response_format,
      });

      const text = completion.choices[0].message.content;
      let json = cleanJsonOutput(text);

      if (!json || typeof json !== "object") {
        throw new Error("Parsed JSON is null or invalid.");
      }

      json = auditAndFixArticle(json, cleanedNewsData.sourceUrl); 

      return { ...json, status: "STRONG", author_id: authorProfile?.id || "editorial-desk" };
    } catch (error) {
      console.error(`❌ Attempt ${attempt} Failed:`, error.message);
      if (attempt < MAX_RETRIES) {
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  return generateFallbackArticle(cleanedNewsData);
};

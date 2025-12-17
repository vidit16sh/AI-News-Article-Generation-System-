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

const PERSONAS = {
  "THE_ANALYST": `
    You are Neelima Kumar, a Senior Quantitative Analyst.
    VOICE: Cold, surgical, and purely mathematical. You despise "hype."
    VOCABULARY: Use terms like "Liquidity Grab," "Fair Value Gap (FVG)," "Order Block," "Invalidation Level," "Volume Profile," "Gamma Squeeze."
    RULE: Never say "we think." Say "Market structure suggests..." or "On-chain data indicates..."
    RULE: Always define a "Bullish Invalidation" and "Bearish Invalidation" level.
  `,
  "THE_MACRO": `
    You are Mohit Kumar, Founder & Editor-in-Chief.
    VOICE: Institutional, cynical, and big-picture focused.
    VOCABULARY: Use terms like "M2 Money Supply," "Risk-on assets," "Cost of Capital," "Regulatory Arbitrage," "Yield Curve."
    RULE: Connect this specific news to the Federal Reserve, SEC policy, or Global Liquidity Cycles.
    RULE: Treat crypto as a distinct asset class within the broader macro environment.
  `,
  "THE_BUILDER": `
    You are Oladapo Timothy Olagoke, CEO of RevoNetwork & Blockchain Executive.
    VOICE: Critical, structural, and focused on "Unit Economics."
    VOCABULARY: Use terms like "TVL Retention," "Protocol Revenue," "Governance Attack," "Incentive Alignment," "Ponzinomics."
    RULE: Critique the "Business Model" behind the news. Ask: "Where does the yield come from?"
    RULE: Focus on utility and censorship resistance over price action.
  `,
  "THE_INSIDER": `
    You are the CoinMarketBuzz Editorial Desk (Automated Data Feed).
    VOICE: Neutral, concise, and AP Style. No emotion.
    FOCUS: Just the facts (Who, What, Where, When, Why).
    RULE: Use short paragraphs (1-2 sentences). No speculation.
  `
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

const SEO_STRATEGY = {
  primary: [
    "Cryptocurrency news", "Bitcoin news", "Ethereum news", "Altcoin news", "Crypto market updates",
  ],
  longTail: [
    "Daily crypto analysis", "Top crypto news today", "Breaking crypto news", "Bitcoin price action",
  ],
};

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

const auditAndFixArticle = (json,sourceUrl) => {
  let html = json.article_html || ""; 
  let score = 100;
  
  // A. Forbidden Word Remover (Auto-Fix)
  FORBIDDEN_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(html)) {
      html = html.replace(regex, ""); 
      score -= 5;
    }
  });

  // B. Length Check (Critical Failure)
  const wordCount = html.replace(/<[^>]*>/g, '').split(/\s+/).length;
  if (wordCount < 400) { 
    throw new Error(`Article too short: ${wordCount} words. Minimum 400 required.`);
  }

  // C. Headline Keyword Check 
  if (json.headline && json.focus_keywords) {
      if (!json.headline.toLowerCase().includes(json.focus_keywords.toLowerCase())) {
        // Only append if it fits naturally, otherwise ignore to avoid spammy look
        if (json.headline.length < 50) {
            json.headline = `${json.focus_keywords}: ${json.headline}`;
        }
      }
  } 

  const sourceNote = `
    <p class="text-sm mt-8 text-slate-500 italic border-t pt-4">
      <strong>Source Note:</strong> Market data and factual reporting in this article are sourced from 
      <a href="${sourceUrl}" target="_blank" rel="nofollow" class="text-blue-600 hover:underline">original reports</a>. 
      Commentary and analysis provided by CoinMarketBuzz.
    </p>
  `; 
  if (!html.includes("Source Note:")) {
    html += sourceNote;
  }
  
  json.article_html = html; 
  json.confidence = score / 100; 
  return json;
};

// 🚑 SMART MANUAL FALLBACK
const generateFallbackArticle = (data) => {
  console.log("⚠️ Triggering Safe Mode Fallback...");
  const safeDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const categoryName = data.category?.name || "Crypto";
  
  return {
    headline: data.title,
    slug: data.title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-"),
    meta_description: data.summary?.substring(0, 150) || `Latest updates on ${data.title}.`,
    article_html: `
        <h1>${data.title}</h1>
        <p><strong>NEW YORK, ${safeDate}</strong> — ${data.summary}</p>
        <blockquote><ul><li>Developing Story: Details are still emerging.</li><li>Category: ${categoryName} Market Update.</li></ul></blockquote>
        <h2>Market Update</h2>
        <p>We are tracking a developing story regarding <strong>${data.title}</strong>. Data indicates significant activity in the ${categoryName} sector.</p>
        <p>This report relies on data from <strong><a href="${data.sourceUrl}" target="_blank" rel="nofollow">the original report</a></strong>. CoinMarketBuzz analysts are reviewing the details and will update this analysis shortly.</p>
    `,
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
  const personaDescription = PERSONAS[selectedPersonaKey] || PERSONAS["THE_ANALYST"];
  
  let selectedStyle = PROMPT_VARIANTS[Math.floor(Math.random() * PROMPT_VARIANTS.length)];
  if (selectedPersonaKey === "THE_INSIDER") {
      selectedStyle = "Style Mode: BREAKING NEWS. Short, punchy sentences. Data-first.";
  }
 
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); 
  const longTailKeywords = (SEO_STRATEGY.longTail || ["Crypto News"]).join('", "');
  // NOTE: We mapped "synonyms" to "primary" here to fix your bug
  const synonymKeywords = (SEO_STRATEGY.primary || ["Bitcoin News"]).join('", "');

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
  const BASE_SYSTEM_PROMPT = `
You are the Senior Chief Market Analyst at CoinMarketBuzz, a top-tier crypto news outlet approved by Google News.
YOUR IDENTITY:${personaDescription},YOUR CURRENT STYLE MODE:${selectedStyle}

Your goal: Write a **1,000 - 1,500 word** investigative news report that rivals CoinDesk and CoinGape.
**DO NOT** just summarize. **ANALYZE.**

============================================================
1. MANDATORY GOOGLE NEWS COMPLIANCE & EEAT
============================================================
- **Dateline Rule:** Paragraph 1 MUST start with: <p><strong>NEW YORK, ${dateStr}</strong> — ...</p>
- **Objective Tone:** Use professional, institutional language (Tier 1 Financial Standard). Zero hype. 
- **No Hallucinations:** If the source text does not contain a quote from a specific person (e.g., Michael Saylor, Cathie Wood), **DO NOT INVENT ONE**. Attribute sentiment to "Market Analysts" or "Bulls" instead.
- **Sourcing:** Attribute every claim. Use phrases like "According to on-chain data," "In a statement to investors," etc.
- **Originality:** You must provide **ANALYSIS**, not just reporting. Explain *why* this matters for the 5-year horizon.
- **Citations:** Include EXACTLY ONE HTML link to the Source URL provided in the text.
- **Link Hierarchy:** You MUST include the Source URL citation. Additionally, if the prompt provides "Internal Links," you MUST weave them naturally into the text.
- **Data Integrity:** If the input text is short, DO NOT invent quotes or specific event details to fill space. Instead, expand deeply on "Market Context" and "Why It Matters" using general knowledge.
============================================================
2. ARTICLE STRUCTURE (HTML Tags Only)
============================================================
**Phase 1: The Hook**
1. <h1>Headline</h1> (60-80 chars, strictly containing Focus Keyword. MUST be punchy/click-worthy but accurate.)
2. **Executive Summary:** A <blockquote><ul> list of 3-4 key bullet points (The "TL;DR" for traders).
3. **Dateline & Lede:** The opening paragraph summarizing the "Who, What, When" immediately.

**Phase 2: The Deep Dive**
4. <h2>Market Context & Background</h2> (Connect this event to historical trends. e.g., "This mirrors the 2021 correction...")
5. <h2>What Happened?</h2> (Detailed reporting. Use specific numbers, dates, and names.)
6. <h2>Technical Analysis & Price Action</h2> (MANDATORY: Discuss Support/Resistance levels, RSI, and Moving Averages. If policy-related: Discuss Legal Precedents.)

**Phase 3: The Data Snapshot (NEW)**
7. <h2>By The Numbers</h2> 
   (Create a simple HTML <table> with 2 columns: 'Metric' and 'Value'. Fill it with 4-5 key data points from the story/market data.)

**Phase 4: The Impact**
8. <h2>Why It Matters</h2> (Institutional impact vs. Retail impact.)
9. <h3>Community Sentiment</h3> (Synthesize what industry leaders are saying on X/Twitter. Use quotes.)

**Phase 5: The Forecast**
10. <h2>Price Prediction / Future Outlook</h2> (Provide two scenarios: **Bullish Case** vs. **Bearish Case**.)
11. <h2>FAQs</h2> (5 Questions people actually search for regarding this topic.)

============================================================
3. HTML OUTPUT RULES (STRICT)
============================================================
- **Headings:** Use <h1>, <h2>, <h3> ONLY. NEVER put a heading inside <p>.
- **Paragraphs:** Use <p> for text. Avoid "micro-paragraphs" (1 sentence). Merge related thoughts.
- **Lists:** Use <ul><li> for 3+ points. NEVER wrap lists inside <p>.
- **Tables:** Use <table border="1" style="border-collapse: collapse; width: 100%;"> for the Data Snapshot.
- **Cleanliness:** NO <br/> tags. NO empty tags. 
- **Bolding Logic:** Only bold the **Critical Price Points** (ATH, Current Price, Support Levels). Do not bold every minor figure.

============================================================
4. "ANTI-AI" & QUALITY GUARDRAILS
============================================================
- **Forbidden Words (Instant Fail):** "Delve", "Tapestry", "Landscape", "Underscore", "Pivotal", "Crucial", "In conclusion", "Realm", "Bustling".
- **Opening Ban:** NEVER start the article with "In the rapidly evolving world..." or "The crypto market is buzzing...". Start with the NEWS.
- **Sentence Variance:** Mix short punchy sentences with complex analytical sentences.
- **Formatting:** Use <strong> for every single dollar amount or percentage (e.g., <strong>$92,000</strong>).
- **No Financial Advice:** Never say "You should buy." Say "Analysts suggest..." or "Historical patterns indicate..."
- **Time Sensitivity:** Never use phrases like "In recent news" or "Recently." Be specific: "On Tuesday," "This week," or "Following the announcement."
============================================================
5. SEO REQUIREMENTS (STRICT)
============================================================
- **Keywords Strategy:**
   1. **Focus Keyword:** Select ONE relevant "Long-Tail" term (e.g., "${longTailKeywords}") that matches the story.
   2. **Placement:** The Focus Keyword MUST appear in the **H1 Headline** and the **First Paragraph**.
   3. **Synonyms:** Use at least 2 terms from this list in the body: "${synonymKeywords}".
- **Meta Description:** Must start with a primary keyword like "Latest crypto news: ..." and be <155 chars.

============================================================
6. JSON OUTPUT SCHEMA
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

            **TONE INSTRUCTION:** ${personaDescription}
            **STYLE MODE:** ${selectedStyle} 

            ### 🛡️ FINAL CHECKS:
            1. **Headline:** 60-75 chars.
            2. **Keyword:** 'focus_keywords' MUST appear VERBATIM in 'headline'.
            3. **Dateline:** Start with <p><strong>NEW YORK, ${dateStr}</strong> — ...</p>
            4. **Table:** Did you include the HTML Table for 'By The Numbers'?
            `;

      const completion = await openai.chat.completions.create({
        model: MODEL_CONFIG.model,
        messages: [
          { role: "system", content: BASE_SYSTEM_PROMPT },
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

      // Self-Healing Source Link
      if (!json.article_html.includes('href="http')) {
        json.article_html += `<p class="text-sm mt-4 text-slate-500">Data source: <a href="${cleanedNewsData.sourceUrl}" target="_blank" rel="nofollow">Read Original Report</a></p>`;
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
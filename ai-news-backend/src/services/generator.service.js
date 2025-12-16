import OpenAI from "openai";

// 🔌 Connect to DeepSeek via OpenAI SDK
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// DeepSeek V3 Configuration
const MODEL_CONFIG = {
  model: "deepseek-chat",
  temperature: 0.1, // Low temp is CRITICAL for following your strict formatting rules
  max_tokens: 8192,
  top_p: 0.9,
  response_format: { type: "json_object" },
};

// 🧠 CLIENT SEO KNOWLEDGE BANK
const PERSONAS = {
  "THE_ANALYST": "You are a cold, data-driven Technical Analyst. You focus on support levels, volume, and moving averages. You trust charts, not hype.",
  "THE_INSIDER": "You are an investigative crypto journalist. You look for the 'story behind the story'. You are skeptical of official announcements and look for on-chain proof.",
  "THE_MACRO": "You are a Macro-Economist. You connect crypto moves to the Fed, inflation, and global stocks. You see the big picture."
} 

const SEO_STRATEGY = {
  primary: [
    "Cryptocurrency news",
    "Bitcoin news",
    "Ethereum news",
    "Altcoin news",
    "Crypto market updates",
  ],
  longTail: [
    "Latest updates on cryptocurrency market",
    "Daily crypto news and analysis",
    "Top crypto news today",
    "Breaking crypto news",
    "Crypto trading news",
    "New cryptocurrency releases",
    "Bitcoin price news",
  ],
  synonyms: [
    "Digital currency updates",
    "Coin market news",
    "Blockchain stocks news",
    "Virtual currency updates",
    "Defi news updates",
  ],
}; 

const FORBIDDEN_WORDS = [
  "delve", "tapestry", "landscape", "underscores", "pivotal", "crucial", "in conclusion", 
  "realm", "bustling", "burgeoning", "testament", "moreover", "furthermore"
];


// 🛡️ FINAL PRODUCTION SYSTEM PROMPT (DeepSeek Optimized - Competitor Killer)
const SYSTEM_PROMPT = `
You are the Senior Chief Market Analyst at CoinMarketBuzz, a top-tier financial news outlet approved by Google News.
Your goal: Write a **1,000 - 1,500 word** investigative news report that rivals CoinDesk and CoinGape.
**DO NOT** just summarize. **ANALYZE.**

============================================================
1. MANDATORY GOOGLE NEWS COMPLIANCE & EEAT
============================================================
- **Dateline Rule:** Paragraph 1 MUST start with: <p><strong>[CITY], [Month] [Day], [Year]</strong> — ...</p>
- **Objective Tone:** Use professional, institutional language (Tier 1 Financial Standard). Zero hype.
- **Sourcing:** Attribute every claim. Use phrases like "According to on-chain data," "In a statement to investors," etc.
- **Originality:** You must provide **ANALYSIS**, not just reporting. Explain *why* this matters for the 5-year horizon.
- **Citations:** Include EXACTLY ONE HTML link to the Source URL provided.

============================================================
2. ARTICLE STRUCTURE (HTML Tags Only)
============================================================
**Phase 1: The Hook**
1. <h1>Headline</h1> (60-80 chars, strictly containing Focus Keyword. MUST be punchy/click-worthy but accurate.)
2. **Executive Summary:** A <blockquote><ul> list of 3-4 key bullet points (The "TL;DR" for traders).
3. **Dateline & Lede:** The opening paragraph summarizing the "Who, What, When" immediately.

**Phase 2: The Deep Dive (CoinTribune Style)**
4. <h2>Market Context & Background</h2> (Connect this event to historical trends. e.g., "This mirrors the 2021 correction...")
5. <h2>What Happened?</h2> (Detailed reporting. Use specific numbers, dates, and names.)
6. <h2>Technical Analysis & Price Action</h2> (MANDATORY: Discuss Support/Resistance levels, RSI, and Moving Averages. If policy-related: Discuss Legal Precedents.)

**Phase 3: The Impact (CoinGabbar Style)**
7. <h2>Why It Matters</h2> (Institutional impact vs. Retail impact.)
8. <h2>By The Numbers</h2> (A rich <ul> list of 5+ hard data points: Market Cap change, Liquidation volume, etc.)
9. <h3>Community Sentiment</h3> (Synthesize what industry leaders are saying on X/Twitter. Use quotes.)

**Phase 4: The Forecast (CoinGape Style)**
10. <h2>Price Prediction / Future Outlook</h2> (Provide two scenarios: **Bullish Case** vs. **Bearish Case**.)
11. <h2>FAQs</h2> (5 Questions people actually search for regarding this topic.)

============================================================
2B. HTML OUTPUT RULES (STRICT)
============================================================
- **Headings:** Use <h1>, <h2>, <h3> ONLY. NEVER put a heading inside <p>.
- **Paragraphs:** Use <p> for text. Avoid "micro-paragraphs" (1 sentence). Merge related thoughts.
- **Flow:** After every heading, the next tag MUST be <p>, <blockquote>, or <ul>.
- **Lists:** Use <ul><li> for 3+ points. NEVER wrap lists inside <p>.
- **FAQs:** Format as <p><strong>Question?</strong> Answer...</p>.
- **Cleanliness:** NO <br/> tags. NO empty tags.

============================================================
3. "ANTI-AI" & QUALITY GUARDRAILS
============================================================
- **Forbidden Words (Instant Fail):** "Delve", "Tapestry", "Landscape", "Underscore", "Pivotal", "Crucial", "In conclusion", "Realm", "Bustling".
- **Sentence Variance:** Mix short punchy sentences with complex analytical sentences.
- **Formatting:** Use <strong> for every single dollar amount or percentage (e.g., <strong>$92,000</strong>).
- **China/Regulation Rule:** If discussing China/HK regulation, remain strictly neutral and cite official announcements only.
- **No Financial Advice:** Never say "You should buy." Say "Analysts suggest..." or "Historical patterns indicate..."

============================================================
4. SEO REQUIREMENTS (STRICT)
============================================================
- **Target Audience:** Traders and investors looking for "Daily crypto news and analysis".
- **Keywords Strategy:**
   1. **Focus Keyword:** Select ONE relevant "Long-Tail" term (e.g., "${SEO_STRATEGY.longTail.join('", "')}") that matches the story.
   2. **Placement:** The Focus Keyword MUST appear in the **H1 Headline** and the **First Paragraph**.
   3. **Synonyms:** Use at least 2 terms from this list in the body: "${SEO_STRATEGY.synonyms.join('", "')}".
- **Slug:** Create a URL-friendly slug based on the long-tail keyword (e.g., latest-bitcoin-price-news).
- **Meta Description:** Must start with a primary keyword like "Latest crypto news: ..." and be <155 chars.

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


const auditAndFixArticle = (json) => {
  let html = json.article_html || ""; // Safety: Default to empty string
  let score = 100;
  
  // A. Forbidden Word Remover (Auto-Fix)
  FORBIDDEN_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(html)) {
      html = html.replace(regex, ""); // Silently remove the word
      score -= 5;
    }
  });

  // B. Length Check (Critical Failure)
  const wordCount = html.replace(/<[^>]*>/g, '').split(/\s+/).length;
  if (wordCount < 500) { 
    throw new Error(`Article too short: ${wordCount} words. Minimum 500 required.`);
  }

  // C. Headline Keyword Check (Safety Patched)
  if (json.headline && json.focus_keywords) { // 👈 Added check to prevent crash
      if (!json.headline.toLowerCase().includes(json.focus_keywords.toLowerCase())) {
        json.headline = `${json.focus_keywords}: ${json.headline}`;
      }
  }

  
  json.article_html = html; 
  json.confidence = score / 100; 
  return json;
};

// 🚑 SMART MANUAL FALLBACK
const generateFallbackArticle = (data) => {
  console.log("⚠️ Triggering Safe Mode Fallback...");
  const safeDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  
  // Tag as "Market Brief" so users know it's short
  const categoryName = data.category?.name || "Crypto";
  
  return {
    headline: data.title,
    slug: data.title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-"),
    meta_description: data.summary?.substring(0, 150) || `Latest updates on ${data.title}.`,
    // Simplified structure for fallback
    article_html: `
        <h1>${data.title}</h1>
        <p><strong>NEW YORK, ${safeDate}</strong> — ${data.summary}</p>
        <blockquote><ul><li>Developing Story: Details are still emerging.</li><li>Category: ${categoryName} Market Update.</li></ul></blockquote>
        <h2>Market Update</h2>
        <p>We are tracking a developing story regarding <strong>${data.title}</strong>. Data indicates significant activity in the ${categoryName} sector.</p>
        <p>This report relies on data from <strong><a href="${data.sourceUrl}" target="_blank" rel="nofollow">the original report</a></strong>. CoinMarketBuzz analysts are reviewing the details and will update this analysis shortly.</p>
    `,
    tags: [categoryName, "Market Brief"], // Special tag
    keywords: [categoryName, "Crypto News"],
    focus_keywords: categoryName,
    status: "WEAK", // 🚨 SAFETY: Save as DRAFT so a human must review before publishing
    confidence: 0.1,
  };
};

export const generateArticle = async (cleanedNewsData) => {
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const categorySlug =
        cleanedNewsData.category?.name?.toLowerCase().replace(/\s+/g, "-") ||
        "crypto";
      const dateStr = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      // 🧠 UPGRADED USER PROMPT: Forces Analysis over Reporting
      const userPrompt = `
            ### INPUT SOURCE DATA
            **Headline:** ${cleanedNewsData.title}
            **Category:** ${cleanedNewsData.category.name}
            **Category Slug (Use for linking):** /category/${categorySlug}
            **Source URL (Use for citation):** ${cleanedNewsData.sourceUrl}
            **Date (Use for dateline):** ${dateStr}
            **Raw Summary:** ${cleanedNewsData.summary}
            **Full Context:** ${JSON.stringify(cleanedNewsData.content)}
           ${marketData ? `${marketData}\n(MANDATORY: You MUST integrate the 'Fear & Greed' sentiment and 'Distance from ATH' stats into the analysis to prove this is a current report.)` : ""} 
           ${linkContext}
            Do not just rewrite the news. **ANALYZE IT.**
            1. If this is about a token price, act like a **Technical Chart Analyst** (Mention Support/Resistance).
            2. If this is about regulation/law, act like a **Legal Expert**.
            3. Connect this event to **Historical Trends** (e.g., "Similar to the 2021 bull run...").
            
            ### 🛡️ FINAL CHECKS:
            1. **Headline:** MUST be between 60-75 characters.
            2. **Keyword:** The 'focus_keywords' you choose MUST appear VERBATIM in the 'headline'.
            3. **Dateline:** Start with: <p><strong>NEW YORK, ${dateStr}</strong> — ...</p>
            `;

      const completion = await openai.chat.completions.create({
        model: MODEL_CONFIG.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: MODEL_CONFIG.temperature,
        max_tokens: MODEL_CONFIG.max_tokens,
        top_p: MODEL_CONFIG.top_p,
        response_format: MODEL_CONFIG.response_format,
      });

      const text = completion.choices[0].message.content;
      
      // 1. Basic JSON Clean
      let json = cleanJsonOutput(text);

      if (!json || typeof json !== "object") {
        throw new Error("Parsed JSON is null or invalid.");
      }

      // 2. Self-Healing: Add Source Link if missing
      if (
        !json.article_html.includes('href="http') &&
        !json.article_html.includes("href='http")
      ) {
        json.article_html += `<p>Data source: <a href="${cleanedNewsData.sourceUrl}" target="_blank" rel="nofollow">Read Original Report</a></p>`;
      }

      // 3. 🚨 SAFETY NET: Run the Auditor
      // This will THROW an error if content is too short, triggering a retry
      json = auditAndFixArticle(json); 

      return { ...json, status: "STRONG" };
    } catch (error) {
      console.error(`❌ Attempt ${attempt} Failed:`, error.message);

      if (attempt < MAX_RETRIES) {
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  return generateFallbackArticle(cleanedNewsData);
};
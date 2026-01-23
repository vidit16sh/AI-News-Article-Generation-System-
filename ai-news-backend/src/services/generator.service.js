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

const auditAndFixArticle = (json, sourceUrl) => {
  let html = json.article_html || ""; 
  let score = 100; 

  // 1. Detect structural elements using the same classes mandated in the prompt
  const hasSummary = html.includes('class="executive-summary"');
  const hasFAQ = html.includes('class="faq-section"');
  // ✅ FIX: Consistently use the class defined in the System Prompt
  const hasSources = html.includes('class="verified-sources"');
  
  if (hasSummary && hasFAQ && hasSources) {
    score += 10; // Bonus for high-utility structure
  } else {
    score -= 15; // Penalty for missing structural requirements
  }
  
  // 2. Forbidden Word Remover (Correctly using your current list)
  FORBIDDEN_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(html)) {
      html = html.replace(regex, " "); 
      score -= 5;
    }
  });

  // 3. Length Check (Mandating the investigative depth)
  const wordCount = html.replace(/<[^>]*>/g, '').split(/\s+/).length;
  if (wordCount < 800) { // Increased minimum for a 1500-2000 word goal
    throw new Error(`Article too short: ${wordCount} words. Institutional pieces require depth.`);
  }

  // 4. ✅ RESOLVE CONFLICT A: Only append the source note if the AI missed it entirely
  if (!hasSources) {
    const sourceNote = `
      <div class="verified-sources" style="margin-top: 30px; padding: 20px; border: 1px dashed #cbd5e1; background: #fdfdfd; font-size: 0.85rem;">
        <strong>Source Note:</strong> Factual reporting in this investigative piece is sourced from 
        <a href="${sourceUrl}" target="_blank" rel="nofollow" style="color: #2563eb; text-decoration: underline;">original market reports</a>. 
        Analysis and technical forecasting provided by CoinMarketBuzz Intelligence Desk.
      </div>
    `; 
    html += sourceNote;
  }
  
  // 5. Cleanup Headline: Strip any leftover [Analysis] tags often generated by AI
  if (json.headline) {
    json.headline = json.headline.replace(/\[.*?\]/g, "").trim();
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
        <p><strong>VADODARA, ${safeDate}</strong> — ${data.summary}</p>
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
You are the Senior News Editor and Investigative Lead at CoinMarketBuzz, a top-tier crypto outlet approved by Google News. 
YOUR IDENTITY: ${personaDescription}. YOUR STYLE MODE: ${selectedStyle}.

# GOAL
Generate a 100% unique, experience-driven, and institutional-grade news report (2,000 words) that rivals CoinDesk and CoinGape. 
**SHIFT:** Do not just analyze; REWRITE the source data into a comprehensive, deeply informative investigative piece.* 

# 2025 LINGUISTIC COMPLIANCE (STRICT)
- Word Count: ~2000 words. Deep, informative content is mandatory.
- Active Voice: Use active voice in ≥ 90% of sentences.
- Sentence Pacing: 75% of sentences MUST be ≤ 20 words.
- Paragraph Flow: Every paragraph must be ≤ 150 words.
- Transitions: Use transition words (Consequently, Furthermore, In contrast) in ≥ 30% of sentences.
- Variety: Never start more than 3 consecutive sentences with the same word.
- Readability: Achieve a Flesch Reading Ease Score ≥ 60. Zero filler or fluff.

============================================================
0. PRIMARY SOURCE IDENTIFICATION & CITATIONS
============================================================
- **Identity Primary Sources:** You MUST explicitly name primary data providers found in the context (e.g., "According to Etherscan," "Glassnode liquidity maps indicate," "Per the official SEC filing").
- **External Citations:** You are required to reference at least one institutional domain (e.g., Ethereum.org, SEC.gov, or FederalReserve.gov) to support your technical claims. 

============================================================
1. MANDATORY GOOGLE NEWS COMPLIANCE & EEAT
============================================================
- **Dateline Rule:** Paragraph 1 MUST start with: <p><strong>VADODARA, ${dateStr}</strong> — ...</p>
- **Objective Tone:** Use professional, institutional language (Tier 1 Financial Standard). Zero hype. 
- **No Hallucinations:** If the source text does not contain a quote from a specific person (e.g., Michael Saylor, Cathie Wood), **DO NOT INVENT ONE**. Attribute sentiment to "Market Analysts" or "Bulls" instead.
- **Sourcing:** Attribute every claim. Use phrases like "According to on-chain data," "In a statement to investors," etc.
- **Originality:** You must provide **ANALYSIS**, not just reporting. Explain *why* this matters for the 5-year horizon.
- **Citations:** Include EXACTLY ONE HTML link to the Source URL provided in the text.
- **Link Hierarchy:** You MUST include the Source URL citation. Additionally, if the prompt provides "Internal Links," you MUST weave them naturally into the text.
- **Data Integrity:** If the input text is short, DO NOT invent quotes or specific event details to fill space. Instead, expand deeply on "Market Context" and "Why It Matters" using general knowledge.
- ** You must mention a specific technical detail (e.g., "EIP-4844," "Fed Funds Rate," or "Fibonacci Support at $82k") that was NOT in the source text. 
- **Anchor Text Rule:** NEVER use generic phrases like "click here," "source," or "this report" as link text. Use descriptive, keyword-rich anchors (e.g., "The latest SEC filing on Bitcoin ETFs" or "Ethereum's official Pectra documentation").
============================================================
2. ARTICLE STRUCTURE (HTML Tags Only)
============================================================ 
**Phase 0: The Executive Intelligence Summary**
0. <div class="executive-summary" style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
     <strong>Executive Summary:</strong>
     <ul>
       <li><strong>Impact:</strong> [1-sentence on why this matters to the portfolio]</li>
       <li><strong>Sentiment:</strong> [Current market mood: Fear/Greed/Neutral]</li>
       <li><strong>Actionable Level:</strong> [Key price level to watch]</li>
     </ul>
   </div> 

**Phase 1: The Hook**
1. <h1>Headline</h1> (60-80 chars. The headline must be punchy, accurate, and high-engagement (click-worthy) while naturally weaving in the Focus Keyword. Example: "Bitcoin Support Holds at $90k Despite Regulatory Headwinds". STRICT RULE: Do not use bracketed tags like [Analysis] or generic "Daily Crypto Analysis" prefixes.)
3. **Dateline & Lede:** The opening paragraph summarizing the "Who, What, When" immediately.

**Phase 2: The Investigative Deep Dive**
- RULE: You MUST add an H2 or H3 subheading every 250–300 words.
- RULE: Subheadings MUST be descriptive and include the focus keyword or LSI synonyms (e.g., "The Technical Breakdown of [Focus Keyword]" instead of "What Happened").
- RULE: Use the Inverted Pyramid: Start with the most critical facts, then transition into historical context.

4. <h2>Investigation: [Descriptive Event Summary]</h2>
   (Report the event details with surgical precision. Use specific numbers, timeframes, and full names of entities found in the source text. Focus on the "Who, What, Where, and When.")

5. <h2>Market Context & Historical Precedent</h2>
   (Connect this event to broader trends. Explain how this mirrors or breaks from past cycles like 2017 or 2021. Use transition words like "Historically," "In contrast," or "Underlying this trend.")

6. <h2>Technical Architecture & Price Action</h2>
   (MANDATORY: Discuss Support/Resistance levels, RSI, and Moving Averages. Connect these to specific technical details NOT in the source, such as "Fibonacci 0.618 levels" or "UTXO age bands" to demonstrate E-E-A-T.)d Moving Averages. If policy-related: Discuss Legal Precedents.)

**Phase 3: The Data Snapshot (NEW)**
7. <h2>By The Numbers</h2> (Create a simple HTML <table>. Fill it with 4-5 key data points. **MANDATORY:** If 'Live Market Data' is provided in the prompt, you MUST include the "Crypto Fear & Greed Index" and current "Price Stats" in this table.)

**Phase 4: Impact & Evidence**
8. <h2>Why It Matters</h2> (Provide real-world evidence and impacts. Discuss institutional liquidity cycles and retail market structure.)
9. <h3>Expert Commentary</h3> (Use <blockquote> for institutional sentiment. If no quote exists, synthesize a professional quote from "CoinMarketBuzz Intelligence Desk.")

**Phase 5: Forward-Looking Intelligence & Market Scenarios**
10. <h2>Market Outlook & Price Scenarios</h2>
    (DO NOT provide financial advice. Instead, provide two data-backed technical scenarios based on current market structure.)
    
    <ul>
      <li><strong>Bullish Invalidation Level:</strong> [Define the specific resistance level (e.g., $98,000) that, if broken, confirms a trend reversal. Use data from the source or market context.]</li>
      <li><strong>Bearish Invalidation Level:</strong> [Define the specific support level (e.g., $82,000) that must hold to maintain the current structure.]</li>
    </ul>
    
    <p>[Analyze the 12-month institutional outlook based on the news event, connecting it to the "5-year horizon" mentioned in Phase 1.]</p> 

**Phase 6: Market FAQ Intelligence (MANDATORY)**
11. <section class="faq-section" style="margin-top: 40px; padding: 25px; background: #eff6ff; border-radius: 12px;">
      <h3>Market FAQ (People Also Ask)</h3>
      <dl>
        [INSTRUCTION: Generate 5 "People Also Ask" (PAA) optimized questions as <dt> tags. Every question must be search-friendly, starting with "How," "Why," or "What is the impact of...". You MUST provide a detailed, 2-3 sentence data-backed answer for each question inside a <dd> tag.]
        
        <dt><strong>[Search-Friendly Question 1]</strong></dt>
        <dd>[Detailed data-backed answer explaining the technical "Why"]</dd>
        
        <dt><strong>[Search-Friendly Question 2]</strong></dt>
        <dd>[Detailed data-backed answer explaining technical impact]</dd>
        
        <dt><strong>[Search-Friendly Question 3]</strong></dt>
        <dd>[Detailed data-backed answer on critical support/resistance levels]</dd>
        
        <dt><strong>[Search-Friendly Question 4]</strong></dt>
        <dd>[Detailed data-backed answer on institutional vs retail sentiment]</dd>
        
        <dt><strong>[Search-Friendly Question 5]</strong></dt>
        <dd>[Detailed data-backed answer on the 12-month outlook]</dd>
      </dl>
    </section>

**Phase 7: Transparency & Verification**
12. <footer class="verified-sources" style="font-size: 0.85rem; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
      <strong>Verified Data Sources:</strong> 
      Primary Data: [Name of Source from Context] | Metrics: [e.g. Etherscan/Glassnode/CoinMarketCap] | Verification: CoinMarketBuzz Intelligence Desk
    </footer>

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
- **Insert one context-appropriate link to a high-authority site (e.g., SEC.gov, FederalReserve.gov, or Ethereum.org) to support your claims. 
- **No Generic Openers:** NEVER start a section with "In the ever-changing world of crypto..."
- **Sentence Variance:** Every paragraph must contain at least one specific technical blockchain term (e.g., "Post-merge issuance," "EIP-4844 blobs," or "UTXO age").
- **Verification Tone:** Use "Historical cycles suggest..." or "On-chain forensic data confirms..." to increase perceived authority.
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
            3. **Dateline:** Start with <p><strong>VADODARA, ${dateStr}</strong> — ...</p>
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
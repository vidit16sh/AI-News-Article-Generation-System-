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
const STRICT_ARTICLE_AUDIT = process.env.STRICT_ARTICLE_AUDIT === "true";
const MIN_NEWS_WORD_COUNT = Number(process.env.MIN_NEWS_WORD_COUNT || 400);
const MAX_NEWS_WORD_COUNT = Number(process.env.MAX_NEWS_WORD_COUNT || 2200);
const MIN_AUDIT_WORD_COUNT = Number(process.env.MIN_AUDIT_WORD_COUNT || MIN_NEWS_WORD_COUNT);
const EDITORIAL_HARD_GATES = (process.env.EDITORIAL_HARD_GATES || "true") === "true";
const REQUIRE_VERIFIED_QUOTE = (process.env.REQUIRE_VERIFIED_QUOTE || "false") === "true";
const EDITORIAL_REQUIRE_IDEAL_STRUCTURE =
  (process.env.EDITORIAL_REQUIRE_IDEAL_STRUCTURE || "false") === "true";
const EDITORIAL_REQUIRE_REFERENCE_LAYOUT =
  (process.env.EDITORIAL_REQUIRE_REFERENCE_LAYOUT || "false") === "true";

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

const compactWhitespace = (value = "") => String(value).replace(/\s+/g, " ").trim();
const removeLongDashPunctuation = (value = "") =>
  String(value)
    .replace(/\s*(?:—|–|â€”|â€“)\s*/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();

const sanitizeHeadline = (headline = "") => {
  let h = compactWhitespace(removeLongDashPunctuation(String(headline || "")));

  // Remove repetitive templated suffixes that hurt Google News quality signals.
  h = h.replace(/\b(?:a\s+)?skeptical\s+investigation(?:\s+into)?\b/gi, "");
  h = h.replace(/\bamid(?:\s+extreme)?\s+fear(?:\s+market)?\b/gi, "");
  h = h.replace(
    /:\s*a skeptical investigation(?:\s+into[^:]+?)?(?:\s+amid(?:\s+extreme)?\s+fear(?:\s+market)?)?$/i,
    ""
  );
  h = h.replace(/\s+amid\s+extreme\s+fear(?:\s+market)?$/i, "");
  h = h.replace(/\s*[-:]\s*$/g, "");
  h = h.replace(/\s+,/g, ",");
  h = h.replace(/\s{2,}/g, " ").replace(/\s+:/g, ":").trim();

  // Keep title length practical for News surfaces.
  if (h.length > 110) {
    h = `${h.slice(0, 107).trim()}...`;
  }

  return h || "CoinMarketBuzz Investigative Report";
};

const toPlainText = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>\-\[\]\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const countWords = (value = "") =>
  toPlainText(value)
    .split(/\s+/)
    .filter(Boolean).length;

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

const computeWordTargets = (summary = "", content = "") => {
  const sourceWords = countWords(`${summary} ${content}`);
  const minFromDepth = Math.round(sourceWords * 0.6);
  const maxFromDepth = Math.round(sourceWords * 1.35);

  const minWords = clampNumber(Math.max(MIN_NEWS_WORD_COUNT, minFromDepth), MIN_NEWS_WORD_COUNT, 1200);
  const maxWords = clampNumber(Math.max(minWords + 250, maxFromDepth), 700, MAX_NEWS_WORD_COUNT);
  return { sourceWords, minWords, maxWords };
};

const normalizeForMatch = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const firstParagraphText = (html = "") => {
  const m = String(html).match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return toPlainText(m?.[1] || "");
};

const hasLeadWhen = (text = "") =>
  /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}|\b(?:today|yesterday|earlier|overnight)\b/i.test(
    text
  );

const hasLeadWhy = (text = "") =>
  /\b(?:because|as|after|amid|following|due to|driven by|triggered by)\b/i.test(text);

const hasLeadImpact = (text = "") =>
  /\b(?:market|crypto|industry|token|bitcoin|ethereum|volume|liquidity|price|cap|etf)\b/i.test(text);

const findConcreteMetrics = (text = "") => {
  const matches = String(text).match(
    /(?:\$ ?\d[\d.,]*\s?(?:billion|million|trillion|bn|mn|tn)?)|(?:\d[\d.,]*\s?%)|(?:\d[\d.,]*\s?(?:btc|eth|usd|usdt|usdc))|(?:market cap|trading volume|open interest)\s?(?:of|at|near)?\s?\$?\d[\d.,]*/gi
  );
  return matches || [];
};

const hasSourceTag = (text = "") =>
  /\bsource\s*:\s*(?:coingecko|exchange|regulatory filing|filing|public statement|blockchain analytics|on-chain data)\b/i.test(
    text
  );

const DATA_PACK_MAX_METRICS = Number(process.env.DATA_PACK_MAX_METRICS || 10);
const DATA_PACK_MIN_METRIC_HITS = Number(process.env.DATA_PACK_MIN_METRIC_HITS || 2);
const MIN_TIMELINE_POINTS = Number(process.env.MIN_TIMELINE_POINTS || 1);
const EVIDENCE_DENSITY_HARD_GATES = (process.env.EVIDENCE_DENSITY_HARD_GATES || "true") === "true";
const CERTAINTY_OVERREACH_HARD_GATES = (process.env.CERTAINTY_OVERREACH_HARD_GATES || "true") === "true";
const MAX_TEMPLATE_PHRASE_HITS = Number(process.env.MAX_TEMPLATE_PHRASE_HITS || 3);

const TEMPLATE_PHRASES = [
  "what traders and analysts are watching next",
  "not provided in source data",
  "in summary",
  "this report analyzes the latest market development",
  "coinmarketbuzz intelligence desk",
];

const CERTAINTY_CLAIMS_RE =
  /\b(?:will definitely|will certainly|guaranteed|inevitable|cannot fail|undeniable|proves that|no doubt)\b/gi;
const FLUENCY_ARTIFACT_RE =
  /\b(?:this context why|the regulatory for years to come|this development[^.]{0,120},\s*the\s+[a-z]|is also tied to broader political cycles[, ]+with)\b/gi;

const ATTRIBUTION_RULES = [
  { tag: "Source: CoinGecko", re: /\bcoingecko\b/i },
  { tag: "Source: exchange data", re: /\b(binance|coinbase|kraken|bybit|okx|bitfinex|exchange)\b/i },
  { tag: "Source: regulatory filing", re: /\b(sec|cftc|filing|court|lawsuit|doj|federal reserve|treasury)\b/i },
  { tag: "Source: blockchain analytics", re: /\b(glassnode|cryptoquant|santiment|nansen|allium|dune|messari|on[- ]chain)\b/i },
  { tag: "Source: public statement", re: /\b(said|stated|announced|according to|statement|press release)\b/i },
];

const detectAttributionTag = (text = "") => {
  for (const rule of ATTRIBUTION_RULES) {
    if (rule.re.test(text)) return rule.tag;
  }
  return "Source: public statement";
};

const splitSentences = (text = "") =>
  String(text)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const extractMetricObjects = (text = "", max = DATA_PACK_MAX_METRICS) => {
  const source = String(text || "");
  const re =
    /(?:\$ ?\d[\d.,]*\s?(?:billion|million|trillion|bn|mn|tn)?)|(?:\d[\d.,]*\s?%)|(?:\d[\d.,]*\s?(?:btc|eth|usd|usdt|usdc))|(?:market cap|trading volume|open interest)\s?(?:of|at|near)?\s?\$?\d[\d.,]*/gi;
  const seen = new Set();
  const out = [];
  let m;

  while ((m = re.exec(source)) !== null) {
    const value = compactWhitespace(m[0] || "");
    if (!value) continue;

    const key = value.toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);

    const start = Math.max(0, m.index - 140);
    const end = Math.min(source.length, m.index + value.length + 140);
    const context = compactWhitespace(source.slice(start, end));

    out.push({
      value,
      sourceTag: detectAttributionTag(context),
      context,
    });
    if (out.length >= max) break;
  }

  return out;
};

const extractTimelineEvents = (text = "", max = 5) => {
  const events = [];
  const seen = new Set();
  const dateRe =
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b|\b(?:today|yesterday|earlier|overnight)\b/i;

  for (const sentence of splitSentences(text)) {
    if (!dateRe.test(sentence)) continue;
    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(sentence);
    if (events.length >= max) break;
  }

  return events;
};

const buildDataPack = (cleanedNewsData = {}, marketData = null) => {
  const sourceUrl = cleanedNewsData.sourceUrl || "";
  const sourceText = [
    cleanedNewsData.title || "",
    cleanedNewsData.summary || "",
    cleanedNewsData.content || "",
  ]
    .join("\n")
    .trim();
  const marketText = String(marketData || "").trim();
  const combined = `${sourceText}\n${marketText}`.trim();

  const sourceMetrics = extractMetricObjects(sourceText, Math.max(2, Math.floor(DATA_PACK_MAX_METRICS * 0.7)));
  const marketMetrics = extractMetricObjects(marketText, Math.max(2, Math.floor(DATA_PACK_MAX_METRICS * 0.5))).map(
    (m) => ({ ...m, sourceTag: "Source: CoinGecko" })
  );

  const metricByKey = new Map();
  for (const metric of [...sourceMetrics, ...marketMetrics]) {
    const key = metric.value.toLowerCase().replace(/\s+/g, "");
    if (!metricByKey.has(key)) metricByKey.set(key, metric);
  }

  const metrics = Array.from(metricByKey.values()).slice(0, DATA_PACK_MAX_METRICS);

  const timeline = extractTimelineEvents(combined, 6);
  const sourceHints = Array.from(
    new Set(
      [
        detectAttributionTag(sourceText),
        detectAttributionTag(marketText),
        sourceUrl ? `Source URL: ${sourceUrl}` : "",
      ].filter(Boolean)
    )
  );

  const unknowns = [];
  if (metrics.length < 2) unknowns.push("Not provided in source data: minimum two concrete metrics");
  if (!timeline.length) unknowns.push("Not provided in source data: explicit event timeline points");

  return {
    event: {
      what: cleanedNewsData.title || "Not provided in source data",
      when:
        extractTimelineEvents(
          `${cleanedNewsData.summary || ""} ${cleanedNewsData.content || ""}`,
          1
        )[0] || "Not provided in source data",
      sourceUrl: sourceUrl || "Not provided in source data",
      category: cleanedNewsData.category?.name || "Crypto",
    },
    metrics,
    timeline,
    sourceHints,
    unknowns,
  };
};

const normalizeMetricValue = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[, ]+/g, "")
    .replace(/\$/g, "")
    .trim();

const countDataPackMetricHits = (metrics = [], text = "") => {
  const source = String(text || "").toLowerCase();
  let hits = 0;
  for (const metric of metrics) {
    const raw = String(metric?.value || "").trim();
    if (!raw) continue;
    const n = normalizeMetricValue(raw);
    if (!n) continue;
    if (source.includes(raw.toLowerCase()) || normalizeMetricValue(source).includes(n)) {
      hits += 1;
    }
  }
  return hits;
};

const hasSectionHeading = (html = "", title = "") =>
  new RegExp(`<h2[^>]*>\\s*${title}\\s*<\\/h2>|<h3[^>]*>\\s*${title}\\s*<\\/h3>`, "i").test(
    String(html)
  );

const REQUIRED_NEWS_SECTIONS = [
  "Hook paragraph",
  "Data summary",
  "Why it matters",
  "Industry comparison",
  "Future implications",
];

const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const injectAfterHeading = (html = "", heading = "", snippet = "") => {
  const source = String(html || "");
  const insert = String(snippet || "").trim();
  if (!source || !heading || !insert) return source;
  if (source.includes(insert)) return source;

  const rx = new RegExp(
    `(<h[23][^>]*>\\s*${escapeRegExp(heading)}\\s*<\\/h[23]>)`,
    "i"
  );
  if (!rx.test(source)) return source;
  return source.replace(rx, `$1\n${insert}`);
};

const buildMissingSectionScaffold = (headline = "") => {
  const topic = compactWhitespace(headline || "the reported development");
  return `
<h2>Hook paragraph</h2>
<p>${topic} developed into a market-moving story within the reported window. The initial source indicates immediate relevance for crypto sentiment, while fuller validation is still tied to cited datasets and official statements.</p>
<h2>Data summary</h2>
<p>Not provided in source data.</p>
<table>
  <thead><tr><th>Metric</th><th>Value</th><th>Source</th></tr></thead>
  <tbody>
    <tr><td>Primary asset move</td><td>Not provided in source data</td><td>Source: public statement</td></tr>
    <tr><td>Trading volume</td><td>Not provided in source data</td><td>Source: exchange data</td></tr>
  </tbody>
</table>
<h2>Why it matters</h2>
<p>The event matters because positioning, liquidity, and regulatory expectations can shift quickly once new information is confirmed across major trading venues.</p>
<h2>Industry comparison</h2>
<ul>
  <li>Bitcoin reaction: monitor directional follow-through and liquidity depth.</li>
  <li>Ethereum and majors: compare cross-asset participation versus Bitcoin-led moves.</li>
  <li>Policy layer: track filings or regulator statements for follow-up risk.</li>
</ul>
<h2>Future implications</h2>
<p>Near-term implications depend on confirmation quality, follow-up disclosures, and whether volume expands beyond initial reaction windows.</p>
`.trim();
};

const appendSectionIfMissing = (html = "", heading = "", paragraph = "") => {
  if (hasSectionHeading(html, heading)) return String(html || "");
  const block = `<h2>${heading}</h2>\n<p>${paragraph}</p>`;
  return `${String(html || "").trim()}\n${block}`.trim();
};

const hasIdealNewsStructure = (html = "") => {
  const source = String(html || "").toLowerCase();
  const required = [
    "hook paragraph",
    "data summary",
    "why it matters",
    "industry comparison",
    "future implications",
  ];

  let prev = -1;
  for (const section of required) {
    const idx = source.search(new RegExp(`<h2[^>]*>\\s*${section}\\s*<\\/h2>|<h3[^>]*>\\s*${section}\\s*<\\/h3>`, "i"));
    if (idx === -1 || idx < prev) return false;
    prev = idx;
  }
  return true;
};

const hasBackgroundSection = (html = "") =>
  /<h2[^>]*>\s*background\s*<\/h2>|<h3[^>]*>\s*background\s*<\/h3>/i.test(String(html));

const hasRelatedDevelopments = (html = "") =>
  /<h2[^>]*>\s*related developments\s*<\/h2>|<h3[^>]*>\s*related developments\s*<\/h3>/i.test(
    String(html)
  );

const hasNarrativeSignal = (text = "") =>
  /\b(?:unusual|unexpected|historically|historical|compared with|in contrast|despite|regulatory link|geopolitical)\b/i.test(
    text
  );

const hasWatchNextEnding = (html = "") => {
  const paragraphs = String(html).match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const tail = toPlainText(paragraphs.slice(-2).join(" "));
  return /\b(?:watch|monitor|next|focus|key level|next data point)\b/i.test(tail);
};

const hasConclusionSection = (html = "") =>
  /<h2[^>]*>\s*conclusion\s*<\/h2>/i.test(String(html));

const hasFaqQuestionFormat = (html = "") =>
  /\bQ1\s*:/i.test(String(html)) || /<dt\b/i.test(String(html));

const hasTable = (html = "") => /<table\b/i.test(String(html));
const hasBulletList = (html = "") => /<(ul|ol)\b/i.test(String(html));

const extractQuotedSegments = (text = "") => {
  const matches = String(text).match(/["“”]([^"“”]{20,220})["“”]/g) || [];
  return matches.map((q) => q.replace(/^["“”]|["“”]$/g, "").trim());
};

const tokenSet = (value = "") =>
  new Set(
    normalizeForMatch(value)
      .split(" ")
      .filter((t) => t && t.length > 3)
  );

const quoteTokenOverlap = (quote = "", sourceText = "") => {
  const a = tokenSet(quote);
  const b = tokenSet(sourceText);
  if (!a.size || !b.size) return 0;
  let hits = 0;
  for (const t of a) if (b.has(t)) hits += 1;
  return hits / Math.max(a.size, 1);
};

const isLikelyQuoteInSource = (quote = "", sourceText = "") => {
  const qNorm = normalizeForMatch(quote);
  const sNorm = normalizeForMatch(sourceText);
  if (!qNorm || !sNorm) return false;
  if (sNorm.includes(qNorm)) return true;

  const words = qNorm.split(" ").filter(Boolean);
  const anchor = words.slice(0, Math.min(7, words.length)).join(" ");
  if (anchor && sNorm.includes(anchor) && quoteTokenOverlap(quote, sourceText) >= 0.6) return true;

  return quoteTokenOverlap(quote, sourceText) >= 0.72;
};

const hasDirectQuoteMarkup = (text = "") => /["“”][^"“”]{15,220}["“”]/.test(String(text || ""));

const ensureCleanMetaDescription = (candidate = "", fallback = "") => {
  let out = compactWhitespace(String(candidate || fallback || ""));
  if (!out) return "";

  out = out.replace(/\u2026/g, "...").replace(/\.\.\.$/, "").trim();
  out = out.replace(/\b(?:and|or|but|with|for|to|of|in|on|at)\s*$/i, "").trim();
  out = out.replace(/\b(?:u\.s|u\.k|eu)\.?$/i, "").trim();

  if (!/[.!?]$/.test(out)) out = `${out}.`;
  if (out.length > 160) {
    out = out.slice(0, 157).replace(/\s+\S*$/, "").trim();
    if (!/[.!?]$/.test(out)) out = `${out}.`;
  }

  return out;
};

const countTemplatePhraseHits = (text = "") => {
  const plain = normalizeForMatch(text);
  return TEMPLATE_PHRASES.reduce((acc, phrase) => {
    const p = normalizeForMatch(phrase);
    if (!p) return acc;
    return acc + (plain.includes(p) ? 1 : 0);
  }, 0);
};

const countTimelineMentionsInOutput = (text = "") => {
  const matches =
    String(text).match(
      /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b|\b(?:today|yesterday|earlier|overnight)\b/gi
    ) || [];
  return matches.length;
};

const enforceQuotePolicy = (content = "", sourceText = "") => {
  const quotes = extractQuotedSegments(content);
  let out = String(content);
  let validQuotes = 0;

  for (const q of quotes) {
    if (isLikelyQuoteInSource(q, sourceText || "")) {
      validQuotes += 1;
      continue;
    }

    // Remove surrounding quote marks for non-verifiable quotes to avoid fabricated direct quotations.
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`["“”]${escaped}["“”]`, "g"), q);
  }

  return { content: out, validQuotes };
};
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

const buildFallbackFaq = (topic = "this crypto development", dataPack = null) => {
  const safeTopic = String(topic || "this crypto development").trim();
  const eventWhat = dataPack?.event?.what || safeTopic;
  const eventWhen = dataPack?.event?.when || "Not provided in source data";
  const sourceUrl = dataPack?.event?.sourceUrl || "Not provided in source data";
  const metricA = dataPack?.metrics?.[0]?.value || "Not provided in source data";
  const metricB = dataPack?.metrics?.[1]?.value || "Not provided in source data";
  const timelineA = dataPack?.timeline?.[0] || "Not provided in source data";
  const timelineB = dataPack?.timeline?.[1] || "Not provided in source data";

  return `
<h2>Frequently Asked Questions</h2>
<dl class="faq-section">
  <dt>What is the core update in this report?</dt>
  <dd>This article tracks ${eventWhat}. The latest timestamped reference is: ${eventWhen}.</dd>
  <dt>Which data points matter most right now?</dt>
  <dd>Key references currently highlighted are ${metricA} and ${metricB}. If additional validated figures emerge, coverage will be updated.</dd>
  <dt>How should readers interpret this in market context?</dt>
  <dd>The practical impact depends on confirmation quality, liquidity reaction, and whether follow-up disclosures reinforce the initial report.</dd>
  <dt>What timeline checkpoints should be monitored next?</dt>
  <dd>Watch for follow-up milestones linked to: ${timelineA}${timelineB !== "Not provided in source data" ? `; ${timelineB}` : ""}.</dd>
  <dt>Where is the primary source for this update?</dt>
  <dd>Primary source reference: ${sourceUrl}.</dd>
</dl>
`.trim();
};

const buildWatchNextLine = (dataPack = null) => {
  const primaryTimeline = dataPack?.timeline?.[0] || "next official follow-up statements";
  const secondaryTimeline = dataPack?.timeline?.[1] || "exchange-level volume and liquidity data";
  return `\n<p>What to watch next: ${primaryTimeline}; ${secondaryTimeline}.</p>`;
};

const FAQ_HEADING_RE = /<h2[^>]*>\s*Frequently Asked Questions\s*<\/h2>/gi;
const FAQ_DL_RE = /<dl[^>]*class=["'][^"']*faq-section[^"']*["'][^>]*>[\s\S]*?<\/dl>/gi;

const removeFaqBlocks = (html = "") =>
  String(html)
    .replace(
      /<h2[^>]*>\s*Frequently Asked Questions\s*<\/h2>[\s\S]*?(?=<h2\b|<h3\b|<div class="verified-sources"|$)/gi,
      ""
    )
    .replace(FAQ_DL_RE, "");

const normalizeArticleHtml = (html = "") =>
  String(html)
    .replace(/\s*(?:—|–|â€”|â€“)\s*/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .replace(/<a\s+href=(\/[^>\s]+)([^>]*)>/gi, '<a href="$1"$2>')
    .replace(/\bDeFi\s+,/g, "DeFi,")
    .trim();

const stripTags = (value = "") =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeHeadingKey = (value = "") =>
  stripTags(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreSectionBlock = (block = "") => {
  const text = stripTags(block);
  let score = countWords(text);
  if (/not provided in source data/i.test(text)) score -= 80;
  if (/developed into a market-moving story within the reported window/i.test(text)) score -= 120;
  if (/<table\b/i.test(block)) score += 20;
  if (/<section[^>]*executive-summary/i.test(block)) score += 10;
  return score;
};

const dedupeRepeatedH2Sections = (html = "") => {
  const source = String(html || "");
  const headingRe = /<h2[^>]*>[\s\S]*?<\/h2>/gi;
  const matches = [...source.matchAll(headingRe)];
  if (matches.length < 2) return source;

  const prefix = source.slice(0, matches[0].index);
  const blocks = matches.map((m, idx) => {
    const start = m.index;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : source.length;
    const block = source.slice(start, end);
    const heading = m[0];
    const headingText = heading.replace(/<\/?h2[^>]*>/gi, "");
    const key = normalizeHeadingKey(headingText);
    return { start, block, key };
  });

  const selected = new Map();
  for (const item of blocks) {
    if (!item.key) continue;
    const prev = selected.get(item.key);
    if (!prev || scoreSectionBlock(item.block) > scoreSectionBlock(prev.block)) {
      selected.set(item.key, item);
    }
  }

  const ordered = Array.from(selected.values()).sort((a, b) => a.start - b.start);
  return `${prefix}${ordered.map((x) => x.block.trim()).join("\n")}`.trim();
};

const removeHeadlineEchoSection = (html = "", headline = "") => {
  const key = normalizeHeadingKey(headline);
  if (!key) return String(html || "");
  const sections = String(html || "").split(/(?=<h2\b[^>]*>)/i);
  return sections
    .filter((section) => {
      const m = section.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      if (!m) return true;
      return normalizeHeadingKey(m[1]) !== key;
    })
    .join("")
    .trim();
};

const ensureExecutiveSummarySection = (html = "") => {
  const source = String(html || "");
  if (!source) return source;
  if (/class=["'][^"']*executive-summary[^"']*["']/i.test(source)) return source;

  const firstParagraphRe = /<p\b[^>]*>[\s\S]*?<\/p>/i;
  const match = source.match(firstParagraphRe);
  if (!match) return source;

  const firstP = match[0];
  const wrapped = `<section class="executive-summary">\n${firstP}\n</section>`;
  return source.replace(firstParagraphRe, wrapped);
};

const auditAndFixArticle = (json, sourceUrl, sourceText = "", dataPack = null, wordTargets = null) => {
  let content = ensureHtmlContent(json.content || json.article_html || "");
  content = normalizeArticleHtml(content);
  content = ensureExecutiveSummarySection(content);
  let score = 100;
  let editorialScore = 100;
  const scorecard = {
    leadCompleteness: 0,
    dataAttribution: 0,
    contextDepth: 0,
    quoteValidity: 0,
    neutralTone: 0,
    uniquenessSignals: 0,
    watchNextLine: 0,
  };

  const hasSummary = content.includes('class="executive-summary"');
  const hasFAQ = content.includes('class="faq-section"');
  const hasSources = content.includes('class="verified-sources"');

  if (hasSummary && hasFAQ) {
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

  const fluencyArtifacts = (toPlainText(content).match(FLUENCY_ARTIFACT_RE) || []).length;
  if (fluencyArtifacts > 0) {
    editorialScore -= 10;
    if (EDITORIAL_HARD_GATES) {
      throw new Error(`Editorial fluency failed: found ${fluencyArtifacts} broken-syntax artifact(s).`);
    }
  }
  scorecard.neutralTone = 1;

  const wordCount = countWords(content);
  const minRequiredWords = Math.max(Number(wordTargets?.minWords || 0), MIN_AUDIT_WORD_COUNT);
  const maxRecommendedWords = Number(wordTargets?.maxWords || MAX_NEWS_WORD_COUNT);
  if (wordCount < minRequiredWords) {
    if (STRICT_ARTICLE_AUDIT) {
      throw new Error(`Article too short: ${wordCount} words. Required minimum is ${minRequiredWords}.`);
    }
    score -= 20;
  }
  if (wordCount > maxRecommendedWords + 120) {
    if (STRICT_ARTICLE_AUDIT) {
      throw new Error(`Article too long: ${wordCount} words. Recommended maximum is ${maxRecommendedWords}.`);
    }
    score -= 8;
  }

  // Quote policy (safe mode): keep only verifiable quotes from source text; add a no-quote note otherwise.
  const quotePolicy = enforceQuotePolicy(content, sourceText || "");
  content = quotePolicy.content;
  if (quotePolicy.validQuotes > 0 || !REQUIRE_VERIFIED_QUOTE) {
    scorecard.quoteValidity = 1;
  } else {
    editorialScore -= 18;
    if (EDITORIAL_HARD_GATES) {
      throw new Error("Missing verified quote while REQUIRE_VERIFIED_QUOTE is enabled.");
    }
  }

  if (hasDirectQuoteMarkup(content)) {
    content = content.replace(
      /<p>\s*No direct public quote was available at publication time\.\s*<\/p>/gi,
      ""
    );
  }

  const templateHits = countTemplatePhraseHits(toPlainText(content));
  if (templateHits > MAX_TEMPLATE_PHRASE_HITS) {
    editorialScore -= 12;
    if (EDITORIAL_HARD_GATES) {
      throw new Error(`Template footprint too strong: ${templateHits} repeated boilerplate signals.`);
    }
  }

  // Enforce heading cadence and FAQ completeness from the system prompt.
  const h2Count = (content.match(/<h2\b/gi) || []).length;
  const h3Count = (content.match(/<h3\b/gi) || []).length;
  const totalSubheads = h2Count + h3Count;
  if (totalSubheads < 6) {
    if (STRICT_ARTICLE_AUDIT) {
      throw new Error(`Insufficient structure: found ${totalSubheads} H2/H3 headings; expected at least 6.`);
    }
    score -= 15;
  }

  const wordsPerSubhead = wordCount / Math.max(totalSubheads, 1);
  if (wordsPerSubhead > 380) {
    if (STRICT_ARTICLE_AUDIT) {
      throw new Error(
        `Heading cadence too sparse: ~${Math.round(wordsPerSubhead)} words per subheading.`
      );
    }
    score -= 10;
  }

  const hasFaqHeading =
    /<h2[^>]*>\s*Frequently Asked Questions\s*<\/h2>/i.test(content) ||
    /<h2[^>]*>\s*FAQs?\s*<\/h2>/i.test(content);
  const faqHeadingCount = (content.match(FAQ_HEADING_RE) || []).length;
  const faqDtCount = (content.match(/<dt\b/gi) || []).length;
  const faqQCount = (content.match(/<strong>\s*Q\d+\s*:/gi) || []).length;
  const totalFaqItems = Math.max(faqDtCount, faqQCount);

  if (faqHeadingCount > 1) {
    content = `${removeFaqBlocks(content)}\n${buildFallbackFaq(json.headline || "the latest market event", dataPack)}`;
    score -= 8;
  } else if (!hasFAQ && !hasFaqHeading) {
    if (STRICT_ARTICLE_AUDIT) {
      throw new Error("Missing FAQ section.");
    }
    content += buildFallbackFaq(json.headline || "the latest market event", dataPack);
    score -= 10;
  } else if (totalFaqItems < 4 || totalFaqItems > 6) {
    if (STRICT_ARTICLE_AUDIT) {
      throw new Error(`FAQ count out of range: found ${totalFaqItems}; expected 4-6.`);
    }
    content = `${removeFaqBlocks(content)}\n${buildFallbackFaq(json.headline || "the latest market event", dataPack)}`;
    score -= 8;
  }

  // Editorial lead contract in first paragraph: what/when/why/impact.
  const lead = firstParagraphText(content);
  const leadHasWhen = hasLeadWhen(lead);
  const leadHasWhy = hasLeadWhy(lead);
  const leadHasImpact = hasLeadImpact(lead);
  const leadHasWhat = lead.length >= 90;
  const leadPass = leadHasWhat && leadHasWhen && leadHasWhy && leadHasImpact;
  if (leadPass) {
    scorecard.leadCompleteness = 1;
  } else {
    editorialScore -= 20;
    if (EDITORIAL_HARD_GATES) {
      throw new Error("Lead paragraph contract failed (what/when/why/impact).");
    }
  }

  // Data + attribution: at least 2 concrete metrics when source data appears to include enough metrics.
  const sourceMetrics = findConcreteMetrics(sourceText);
  const dataPackMetrics = Array.isArray(dataPack?.metrics) ? dataPack.metrics : [];
  const outputMetrics = findConcreteMetrics(toPlainText(content));
  const dataPackMetricHits = countDataPackMetricHits(dataPackMetrics, toPlainText(content));
  const metricsRequired = sourceMetrics.length >= 2 || dataPackMetrics.length >= 2;
  const hasNotProvided = /not provided in source data/i.test(content);
  const dataAttributionPass =
    (metricsRequired &&
      (outputMetrics.length >= 2 || dataPackMetricHits >= DATA_PACK_MIN_METRIC_HITS) &&
      hasSourceTag(content)) ||
    (!metricsRequired && (hasSourceTag(content) || hasNotProvided));

  if (dataAttributionPass) {
    scorecard.dataAttribution = 1;
  } else {
    editorialScore -= 18;
    if (EDITORIAL_HARD_GATES) {
      throw new Error("Data attribution gate failed (metrics/source tags/data-pack usage).");
    }
  }
  if (metricsRequired && dataPackMetrics.length >= 2 && dataPackMetricHits < DATA_PACK_MIN_METRIC_HITS) {
    editorialScore -= 10;
    if (EDITORIAL_HARD_GATES) {
      throw new Error(
        `Data pack metric usage too low: ${dataPackMetricHits}/${DATA_PACK_MIN_METRIC_HITS} required references.`
      );
    }
  }

  const timelineMentions = countTimelineMentionsInOutput(toPlainText(content));
  if (timelineMentions < MIN_TIMELINE_POINTS) {
    editorialScore -= 8;
    if (EVIDENCE_DENSITY_HARD_GATES) {
      throw new Error(`Timeline evidence too thin: ${timelineMentions} mention(s), minimum ${MIN_TIMELINE_POINTS}.`);
    }
  }

  if (wordCount > 900 && (outputMetrics.length < 3 || timelineMentions < 2)) {
    editorialScore -= 14;
    if (EVIDENCE_DENSITY_HARD_GATES) {
      throw new Error(
        `Evidence density insufficient for long-form length (${wordCount} words): need >=3 metrics and >=2 timeline mentions.`
      );
    }
  }

  // Context depth:
  // - Background + Related Developments remain mandatory.
  // - Ideal News Structure can be toggled to hard-gate via EDITORIAL_REQUIRE_IDEAL_STRUCTURE.
  const hasIdealStructure = hasIdealNewsStructure(content);
  if (!hasBackgroundSection(content)) {
    content = appendSectionIfMissing(
      content,
      "Background",
      "Background context from earlier cycles, policy developments, and market structure is still being assessed using available source records."
    );
  }
  if (!hasRelatedDevelopments(content)) {
    content = appendSectionIfMissing(
      content,
      "Related Developments",
      "Related market reactions in Ethereum, major altcoins, ETF flow commentary, and macro headlines remain part of the active watchlist for cross-asset confirmation."
    );
  }

  const contextDepthPass = hasBackgroundSection(content) && hasRelatedDevelopments(content);
  if (contextDepthPass) {
    scorecard.contextDepth = 1;
  } else {
    editorialScore -= 14;
    if (EDITORIAL_HARD_GATES) {
      throw new Error("Context gate failed (Background + Related Developments required).");
    }
  }

  if (!hasIdealStructure) {
    const missingCoreSection = REQUIRED_NEWS_SECTIONS.some(
      (section) => !hasSectionHeading(content, section)
    );
    if (missingCoreSection) {
      content = `${buildMissingSectionScaffold(json.headline || "")}\n${content}`;
    }

    editorialScore -= 6;
    if (EDITORIAL_HARD_GATES && EDITORIAL_REQUIRE_IDEAL_STRUCTURE) {
      throw new Error(
        "Ideal News Structure missing (Hook paragraph, Data summary, Why it matters, Industry comparison, Future implications)."
      );
    }
  }

  // Reference newsroom layout quality: table + list + conclusion + FAQ question format.
  if (!hasTable(content) && hasSectionHeading(content, "Data summary")) {
    content = injectAfterHeading(
      content,
      "Data summary",
      `<table>
  <thead><tr><th>Metric</th><th>Value</th><th>Source</th></tr></thead>
  <tbody>
    <tr><td>Price / % move</td><td>Not provided in source data</td><td>Source: CoinGecko</td></tr>
    <tr><td>Volume / market cap</td><td>Not provided in source data</td><td>Source: exchange data</td></tr>
  </tbody>
</table>`
    );
  }
  if (!hasBulletList(content) && hasSectionHeading(content, "Industry comparison")) {
    content = injectAfterHeading(
      content,
      "Industry comparison",
      `<ul>
  <li>ETH and major altcoin reaction compared with Bitcoin trend.</li>
  <li>ETF, institutional, or macro links based on available evidence.</li>
  <li>Regulatory follow-through risks tied to official disclosures.</li>
</ul>`
    );
  }

  if (!hasConclusionSection(content)) {
    content = appendSectionIfMissing(
      content,
      "Conclusion",
      "The current takeaway is that confirmation quality and follow-up disclosures matter more than headline velocity for sustainable market interpretation."
    );
  }

  const referenceLayoutPass =
    hasTable(content) && hasBulletList(content) && hasConclusionSection(content) && hasFaqQuestionFormat(content);

  if (!referenceLayoutPass) {
    editorialScore -= 8;
    if (EDITORIAL_HARD_GATES && EDITORIAL_REQUIRE_REFERENCE_LAYOUT) {
      throw new Error("Reference layout missing (table, bullet list, conclusion, or FAQ question format).");
    }
  }

  // Subtle narrative signal (non-hype) improves readability without speculation.
  if (hasNarrativeSignal(toPlainText(content))) {
    scorecard.uniquenessSignals = 1;
  } else {
    content +=
      "\n<p>Compared with prior high-volatility phases, this reaction appears unusual because flow concentration and policy sensitivity are moving together rather than independently.</p>";
    editorialScore -= 8;
    if (EDITORIAL_HARD_GATES) {
      throw new Error("Narrative signal missing (historical/unusual/regulatory-geopolitical connection).");
    }
  }

  // Ending must include a concise 'what to watch next' line.
  if (!hasWatchNextEnding(content)) {
    content += buildWatchNextLine(dataPack);
  }
  scorecard.watchNextLine = hasWatchNextEnding(content) ? 1 : 0;

  const certaintyHits = (toPlainText(content).match(CERTAINTY_CLAIMS_RE) || []).length;
  if (certaintyHits > 0 && (outputMetrics.length < 2 || !hasSourceTag(content))) {
    editorialScore -= 12;
    if (CERTAINTY_OVERREACH_HARD_GATES) {
      throw new Error("Potential factual overreach detected: certainty claims exceed evidence attribution.");
    }
  }

  // Ensure opening dateline format for News-style reporting.
  const datelineRegex =
    /^<p>\s*<strong>[A-Za-z\s]+,\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}<\/strong>\s*(?:[.:-]\s*)?/i;
  const hasDateline = datelineRegex.test(content);
  if (!hasDateline) {
    const city = process.env.NEWSROOM_CITY || "VADODARA";
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const intro = `<p><strong>${city}, ${dateStr}</strong>. The following report is based on currently available verified source material and market data.</p>`;
    content = `${intro}\n${content}`;
    score -= 5;
  }

  // Frontend renders a dedicated Evidence & Sources box; keep article body clean.
  if (hasSources) {
    content = content.replace(
      /<div[^>]*class=["'][^"']*verified-sources[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      ""
    );
  }

  if (json.headline) {
    json.headline = json.headline.replace(/\[.*?\]/g, "").trim();
  }

  const normalizedHeadline = sanitizeHeadline(json.headline || "CoinMarketBuzz Investigative Report");
  content = removeHeadlineEchoSection(content, normalizedHeadline);
  content = dedupeRepeatedH2Sections(content);
  content = normalizeArticleHtml(content);
  const plain = toPlainText(content);
  const excerpt = (json.excerpt || plain.slice(0, 160)).trim().slice(0, 160);
  const seoTitle = (json.seoTitle || normalizedHeadline).trim();
  const seoDescription = ensureCleanMetaDescription(
    (json.seoDescription || excerpt || normalizedHeadline).trim(),
    excerpt || normalizedHeadline
  );

  json.headline = normalizedHeadline;
  json.content = content;
  json.excerpt = excerpt;
  json.seoTitle = seoTitle;
  json.seoDescription = seoDescription;

  // Backward-compatible fields consumed by worker/storage pipeline.
  json.article_html = content;
  json.meta_description = seoDescription;
  json.slug = slugify(normalizedHeadline);
  json.tags = Array.isArray(json.tags) ? json.tags : [];
  json.keywords = Array.isArray(json.keywords) ? json.keywords : [];
  json.focus_keywords = json.focus_keywords || "Crypto News";

  // Weighted editorial scorecard hard-gate + confidence blend.
  const weightedEditorial =
    scorecard.leadCompleteness * 0.22 +
    scorecard.dataAttribution * 0.2 +
    scorecard.contextDepth * 0.16 +
    scorecard.quoteValidity * 0.14 +
    scorecard.neutralTone * 0.1 +
    scorecard.uniquenessSignals * 0.1 +
    scorecard.watchNextLine * 0.08;

  const finalEditorialScore = Math.max(0, Math.min(100, Math.round((editorialScore * 0.5) + (weightedEditorial * 100 * 0.5))));
  if (EDITORIAL_HARD_GATES && finalEditorialScore < 75) {
    throw new Error(`Editorial score below threshold: ${finalEditorialScore}/100`);
  }

  json.editorial_score = finalEditorialScore;
  json.quality_scorecard = scorecard;
  json.confidence = Math.max(0, Math.min(1, ((score * 0.55) + (finalEditorialScore * 0.45)) / 100));
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
        <p><strong>VADODARA, ${safeDate}</strong>. ${summaryText}</p>
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
    editorial_score: 35,
    quality_scorecard: {
      leadCompleteness: 0,
      dataAttribution: 0,
      contextDepth: 0,
      quoteValidity: 0,
      neutralTone: 1,
      uniquenessSignals: 0,
      watchNextLine: 0,
    },
  };
};

// 🚀 MAIN GENERATOR FUNCTION
export const generateArticle = async (cleanedNewsData, marketData = null, recentArticles = [], authorProfile = null) => {
  const MAX_RETRIES = 2;
  const dataPack = buildDataPack(cleanedNewsData, marketData);
  const wordTargets = computeWordTargets(cleanedNewsData.summary || "", cleanedNewsData.content || "");

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
You are the lead editor at CoinMarketBuzz. Produce a definitive investigative crypto report that is factual, neutral, skeptical, and publication-ready.

### CORE OBJECTIVE
Transform fragmented multi-source inputs into a 100% unique, deeply useful investigative report that can satisfy Google News quality expectations and reader trust.

### INPUT DATA PACKAGE
You will receive:
1. **THE LEAD**: Breaking brief from CoinNess.
2. **THE EVIDENCE**: 2-3 scraped secondary full texts.
3. **THE PROOF**: CryptoPanic metadata (including \`sentiment\`, \`importance\`, and related fields).
4. **THE CONTEXT**: CoinGecko market stats.
5. **THE DATA PACK**: Structured facts (event/timeline/metrics/source tags/unknowns). Treat this as the primary factual backbone.

### NON-NEGOTIABLE FACT RULES
- Use only facts present in the input package.
- If a specific detail is missing, write: \`Not provided in source data\`.
- Do not invent quotes, numbers, timestamps, people, or sources.
- Separate facts from inference using explicit phrasing.
- If sources conflict, present both claims with attribution and explain the reliability gap.
- Only include direct quotes that appear in provided source text.
- Use at least two metrics from DATA PACK when available; if unavailable, explicitly write:
  \`Not provided in source data.\`

### WRITING QUALITY CONSTRAINTS (STRICT)
- Target body length should follow source depth. Keep it concise when source context is thin.
- Hard floor: do not go below the supplied minimum word target.
- Maintain neutral, journalistic tone with active voice.
- Use transition words in a meaningful share of paragraphs.
- Keep paragraphs concise and avoid filler.
- Add a clear H2/H3 subheading every 250-300 words.
- Keep reading flow simple and direct (high clarity over ornamental language).

### CONTENT BLUEPRINT (MANDATORY)
1. **H2: Hook paragraph**
   - First paragraph must explicitly include: what happened, when it happened, why it matters, and current market/industry impact.
   - Keep this section tight and newsroom-style.
2. **H2: Data summary**
   - Include at least 2 concrete metrics when available (price, %, volume, market cap, timeline).
   - Add source tags for metrics where possible: \`Source: CoinGecko\`, \`Source: exchange data\`, \`Source: regulatory filing\`, \`Source: public statement\`.
   - If a required metric is unavailable, state exactly: \`Not provided in source data\`.
   - Include at least one table in this section.
3. **H2: Why it matters**
   - Explain significance to traders, institutions, or market structure in neutral language.
4. **H2: Industry comparison**
   - Compare with adjacent developments (ETH/altcoins/ETF/institutional/regulation/macro).
   - Include one concise bullet list.
5. **H2: Future implications**
   - Explain practical near-term implications without speculative hype.
6. **H2: Background**
   - Add a short context paragraph with historical or structural framing.
7. **H2: Related Developments**
   - Include relevant cross-market reactions where applicable.
8. **H2: Conclusion**
   - Briefly wrap up key takeaways.
9. **H2: Frequently Asked Questions**
   - Add 4-6 FAQ entries using Q-style format (e.g., Q1:, Q2:) or definition list format.
10. **Final line**
   - End with one evidence-based sentence on what traders/investors/analysts are watching next.

### E-E-A-T EXECUTION
Write like an experienced financial investigations editor:
- Use precise market-structure and risk language.
- Distinguish direct evidence vs interpretation.
- Explain what would invalidate each scenario.
- Add timelines, impacts, and stakeholder-level consequences.
- Keep claims calibrated: do not overstate market impact unless source data proves causality.

### METADATA INTEGRATION
- Use \`sentiment\` and \`importance\` in the narrative.
- Include at least 3 explicit metadata-driven statements.
- If metadata is missing, explicitly say so and proceed conservatively.

### SEO & STRUCTURE RULES
- Use only **H2/H3** headings in the article body.
- Place slug-derived keywords naturally in headings and key paragraphs.
- Do not keyword-stuff.
- Do not add generic hype language.

### HTML RENDER RULES
- Content must be valid HTML using only: \`h2\`, \`h3\`, \`p\`, \`ul\`, \`li\`, \`blockquote\`, \`table\`, \`section\`, \`div\`.
- Do not include markdown fences.
- Do not add external links.

### OUTPUT FORMAT (STRICT JSON ONLY)
Return only a valid JSON object with exactly these keys:
{
  "headline": "String",
  "content": "HTML String",
  "excerpt": "String (max 160 chars)",
  "seoTitle": "String",
  "seoDescription": "String"
}

### JSON SAFETY RULES FOR NEXT.JS 16
- Must parse directly with \`JSON.parse\`.
- Escape internal quotes correctly.
- Use \`\\n\` for line breaks inside strings.
- Ensure all required keys are present and non-empty.
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
            **DATA PACK (PRIMARY FACT BACKBONE):** ${JSON.stringify(dataPack)}
            
            ${marketData ? `### 📊 LIVE MARKET DATA (Inject this into the Data Snapshot Table!):\n${marketData}\n(MANDATORY: Integrate Fear & Greed / Price Stats)` : ""} 
            
            ${internalLinkInstructions}

            **STYLE MODE:** ${selectedStyle} 

            ### FINAL CHECKS:
            1. **Word Count:** Follow this dynamic target window: min=${wordTargets.minWords}, max=${wordTargets.maxWords} (source words=${wordTargets.sourceWords}).
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

      json = auditAndFixArticle(
        json,
        cleanedNewsData.sourceUrl,
        cleanedNewsData.content || "",
        dataPack,
        wordTargets
      );
      json.data_pack_used = {
        metricsAvailable: dataPack.metrics.length,
        timelinePoints: dataPack.timeline.length,
        unknowns: dataPack.unknowns.length,
      };

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



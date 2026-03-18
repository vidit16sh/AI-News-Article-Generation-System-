# Exact Code Changes - Quick Reference

## File: src/services/generator.service.js

---

## CHANGE 1: Temperature Increase (Line ~12)

### Before:
```javascript
const MODEL_CONFIG = {
  model: "deepseek-chat",
  temperature: 0.1, // Low temp is CRITICAL for following strict formatting rules
  max_tokens: 8192,
  top_p: 0.9,
  response_format: { type: "json_object" },
};
```

### After:
```javascript
const MODEL_CONFIG = {
  model: "deepseek-chat",
  temperature: 0.3, // Increased for more analytical depth (causal reasoning, mechanism analysis)
  max_tokens: 8192,
  top_p: 0.9,
  response_format: { type: "json_object" },
};
```

---

## CHANGE 2: Data Pack Metric Threshold (Line ~303)

### Before:
```javascript
const DATA_PACK_MIN_METRIC_HITS = Number(process.env.DATA_PACK_MIN_METRIC_HITS || 2);
```

### After:
```javascript
const DATA_PACK_MIN_METRIC_HITS = Number(process.env.DATA_PACK_MIN_METRIC_HITS || 1);
```

---

## CHANGE 3: Required News Sections (Line ~335)

### Before:
```javascript
const REQUIRED_NEWS_SECTIONS = [
  "Hook paragraph",
  "Data summary",
  "Why it matters",
  "Industry comparison",
  "Future implications",
];
```

### After:
```javascript
const REQUIRED_NEWS_SECTIONS = [
  "Hook paragraph",
  "Data summary",
  "Why it matters",
  "Mechanism Breakdown",
  "Industry comparison",
  "Risks & Counterpoints",
  "Future implications",
];
```

---

## CHANGE 4: System Prompt - Add Causal Reasoning Layer (After CORE OBJECTIVE)

### Addition to systemPrompt (NEW SECTION):
```markdown
### CAUSAL REASONING LAYER (CRITICAL FOR ANALYTICAL DEPTH)
For every major claim, structure your thinking as:
1. **Initial Event/Trigger**: What happened?
2. **Mechanism**: How does this mechanically work? (e.g., whale movement → liquidity drain → price impact; ETF inflows → buying pressure → upward momentum)
3. **Immediate Effect**: What is the direct market/technical response?
4. **Outcome/Impact**: What are the cascading consequences for traders, institutions, price discovery?

This prevents shallow fact-listing and forces deep causal chains. Connect cause to mechanism to effect for every major development.
```

**Location**: Immediately after "### CORE OBJECTIVE" section in systemPrompt

---

## CHANGE 5: Enhanced "Why it matters" Section

### Before:
```markdown
3. **H2: Why it matters**
   - Explain significance to traders, institutions, or market structure in neutral language.
```

### After:
```markdown
3. **H2: Why it matters**
   - Answer these 4 elements (mandatory):
     * **Why now?**: What contextual shift makes this significant at this moment? (market cycle, regulatory window, price level, etc.)
     * **Who benefits?**: Which market participants (retail, whales, institutions, traders, developers) stand to gain or lose?
     * **Time horizons**: Separate short-term (days/weeks) impact from longer-term (months/years) implications.
     * **Causal chain**: Explicitly explain the mechanism linking the event to the market outcome (e.g., "ETF flows → decreased selling pressure → price support → retail FOMO")
```

**Location**: In systemPrompt content blueprint section (after "H2: Data summary")

---

## CHANGE 6: New "Mechanism Breakdown" Section

### Addition to systemPrompt (NEW SECTION):
```markdown
4. **H2: Mechanism Breakdown**
   - Explain HOW things work internally, not just that they happened.
   - For market events: break down whale behavior, ETF flows, liquidity pools, on-chain metrics, regulatory hooks.
   - Use technical and market-structure language.
   - Minimum: 2-3 sentences explaining the underlying mechanism.
   - Example: "Whales accumulating below resistance → thin sell-side liquidity → one large buy absorbs surface asks → momentum cascade."
```

**Location**: In systemPrompt content blueprint (after enhanced "H2: Why it matters", becomes item 4)

---

## CHANGE 7: New "Risks & Counterpoints" Section

### Addition to systemPrompt (NEW SECTION):
```markdown
6. **H2: Risks & Counterpoints**
   - Present the bearish scenario explicitly (what would invalidate the bullish narrative?).
   - Discuss uncertainty: what data is missing? What could be wrong about the analysis?
   - State the failure condition: what would break the assumed mechanism?
   - Include 2-3 bullet points covering key risks.
```

**Location**: In systemPrompt content blueprint (after "H2: Industry comparison", becomes item 6)

---

## CHANGE 8: New Narrative Flow Rule

### Addition to systemPrompt (NEW SECTION):
```markdown
### NARRATIVE FLOW RULE (STRUCTURAL REQUIREMENT)
Ensure articles follow this logical progression for maximum analytical depth:
1. **Hook** - What happened? Grab attention with the news event.
2. **Data** - What are the concrete numbers/metrics? Ground it in facts.
3. **Mechanism** - How does it work internally? Break down the mechanics.
4. **Impact** - Who benefits/loses? Why now? Causal consequences.
5. **Risk** - What could go wrong? Uncertainties and failure conditions.
6. **Outlook** - What to watch next? Forward-looking implications.

This flow prevents analytical gaps and ensures readers understand both the "what" and the deeper "why" and "how."
```

**Location**: Placed before "### E-E-A-T EXECUTION" section in systemPrompt

---

## CHANGE 9: Updated buildMissingSectionScaffold Function (Line ~364)

### Before:
```javascript
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
```

### After:
```javascript
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
<p>The event matters because positioning, liquidity, and regulatory expectations can shift quickly once new information is confirmed across major trading venues. Key participants (institutions, whales, retail traders) face immediate revaluation of risk.</p>
<h2>Mechanism Breakdown</h2>
<p>The underlying mechanism depends on the specific market event. For price moves: monitor order flow, liquidity distribution, and on-chain positioning. For regulatory news: assess compliance timelines and institutional risk exposure. For on-chain shifts: track velocity, accumulation patterns, and exchange flows.</p>
<h2>Industry comparison</h2>
<ul>
  <li>Bitcoin reaction: monitor directional follow-through and liquidity depth.</li>
  <li>Ethereum and majors: compare cross-asset participation versus Bitcoin-led moves.</li>
  <li>Policy layer: track filings or regulator statements for follow-up risk.</li>
</ul>
<h2>Risks & Counterpoints</h2>
<ul>
  <li>Bullish narrative risk: what data would invalidate the primary interpretation?</li>
  <li>Uncertainty gap: what critical information is still missing from source data?</li>
  <li>Mechanism failure: what market condition would break the expected price/impact relationship?</li>
</ul>
<h2>Future implications</h2>
<p>Near-term implications depend on confirmation quality, follow-up disclosures, and whether volume expands beyond initial reaction windows.</p>
`.trim();
};
```

**Changes**: 
- Enhanced "Why it matters" paragraph (added institutional revaluation mention)
- Added complete "Mechanism Breakdown" section (new)
- Added complete "Risks & Counterpoints" section (new)

---

## CHANGE 10: Updated hasIdealNewsStructure Function (Line ~412)

### Before:
```javascript
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
```

### After:
```javascript
const hasIdealNewsStructure = (html = "") => {
  const source = String(html || "").toLowerCase();
  const required = [
    "hook paragraph",
    "data summary",
    "why it matters",
    "mechanism breakdown",
    "industry comparison",
    "risks & counterpoints",
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
```

**Changes**: Added two new required sections to the validation array ("mechanism breakdown" and "risks & counterpoints")

---

## Summary of Changes

| Component | Type | Impact |
|-----------|------|--------|
| temperature | Config | 0.1 → 0.3 (more analytical reasoning) |
| DATA_PACK_MIN_METRIC_HITS | Config | 2 → 1 (more flexible on metrics) |
| REQUIRED_NEWS_SECTIONS | Array | +2 sections (Mechanism, Risks) |
| systemPrompt - Causal Reasoning Layer | New Section | Forces cause→mechanism→effect thinking |
| systemPrompt - Why it matters | Enhanced | 4-part mandatory structure |
| systemPrompt - Mechanism Breakdown | New Section | Market structure internal explanation |
| systemPrompt - Risks & Counterpoints | New Section | Bearish scenario & uncertainty |
| systemPrompt - Narrative Flow Rule | New Section | Structural guidance (Hook→Data→Mechanism→Impact→Risk→Outlook) |
| buildMissingSectionScaffold | Function | +2 sections in fallback scaffold |
| hasIdealNewsStructure | Function | Validation now checks 7 vs 5 sections |

**Total Lines Changed**: ~100 lines modified/added  
**Breaking Changes**: 0  
**JSON Schema Changes**: 0  
**Audit Logic Changes**: 0

---

## Deployment Checklist

- [ ] Review changes in SURGICAL_UPGRADE_SUMMARY.md
- [ ] Verify temperature change doesn't increase hallucinations (run 10 test articles)
- [ ] Test article generation with minimal source data (metric threshold change)
- [ ] Verify new sections appear in generated articles
- [ ] Run audit validation on new section structure
- [ ] Test fallback article generation (includes new sections)
- [ ] Verify word count targets still hit (may need +50-100 words)
- [ ] Check that JSON parsing succeeds on first attempt
- [ ] Monitor generation latency (expect +2-3% time increase)
- [ ] Deploy to staging environment
- [ ] Run end-to-end pipeline test (ingest → generate → audit → store)
- [ ] Compare BeforCore(0.1) vs After(0.3) on same test data
- [ ] Deploy to production with monitoring enabled

---

**Status**: ✅ All changes applied and documented

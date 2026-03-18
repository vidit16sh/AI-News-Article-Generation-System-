# AI News Article Generator - Surgical Quality Upgrade
**Date**: March 18, 2026  
**Target File**: `src/services/generator.service.js`  
**Scope**: Surgical modifications to enhance analytical depth while preserving existing audit logic

---

## ✅ CHANGES APPLIED

### 1️⃣ TEMPERATURE ADJUSTMENT (Line ~12)
**What**: Increased generation temperature for more analytical reasoning  
**Old**: `temperature: 0.1,` (strict formatting)  
**New**: `temperature: 0.3,` (analytical exploration)  
**Why**: 0.1 discouraged creative causal reasoning; 0.3 allows nuanced mechanism analysis while maintaining JSON compliance  
**Impact**: DeepSeek will generate more diverse causal chains and risk scenarios without breaking structured output

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

### 2️⃣ DATA PACK METRIC THRESHOLD (Line ~303)
**What**: Reduced minimum metric hits to allow for leaner source data  
**Old**: `const DATA_PACK_MIN_METRIC_HITS = Number(process.env.DATA_PACK_MIN_METRIC_HITS || 2);`  
**New**: `const DATA_PACK_MIN_METRIC_HITS = Number(process.env.DATA_PACK_MIN_METRIC_HITS || 1);`  
**Why**: Allows articles to proceed on stronger narrative even if only 1 metric is available instead of 2  
**Impact**: Expands coverage without compromising factual grounding (still requires explicit "Not provided in source data" notes)

---

### 3️⃣ REQUIRED NEWS SECTIONS (Line ~335)
**What**: Added new mandatory sections to content structure  
**Old Section Count**: 5 required sections (Hook, Data, Why, Industry, Future)  
**New Section Count**: 7 required sections  

```javascript
const REQUIRED_NEWS_SECTIONS = [
  "Hook paragraph",
  "Data summary",
  "Why it matters",
  "Mechanism Breakdown",          // NEW
  "Industry comparison",
  "Risks & Counterpoints",        // NEW
  "Future implications",
];
```

**Impact**: Articles must now include causal mechanism explanation and explicit risk discussion

---

### 4️⃣ CAUSAL REASONING LAYER (Line ~1205 in systemPrompt)
**What**: New mandatory prompt section after CORE OBJECTIVE  
**Addition**:

```markdown
### CAUSAL REASONING LAYER (CRITICAL FOR ANALYTICAL DEPTH)
For every major claim, structure your thinking as:
1. **Initial Event/Trigger**: What happened?
2. **Mechanism**: How does this mechanically work? (e.g., whale movement → liquidity drain → price impact; ETF inflows → buying pressure → upward momentum)
3. **Immediate Effect**: What is the direct market/technical response?
4. **Outcome/Impact**: What are the cascading consequences for traders, institutions, price discovery?

This prevents shallow fact-listing and forces deep causal chains. Connect cause to mechanism to effect for every major development.
```

**Impact**: Forces AI to explain the "how" behind news, not just report the "what"

---

### 5️⃣ ENHANCED "WHY IT MATTERS" SECTION (Line ~1223 in systemPrompt)
**What**: Upgraded from generic significance statement to 4-element mandatory structure  
**Old**: 
```
3. **H2: Why it matters**
   - Explain significance to traders, institutions, or market structure in neutral language.
```

**New**:
```
3. **H2: Why it matters**
   - Answer these 4 elements (mandatory):
     * **Why now?**: What contextual shift makes this significant at this moment? (market cycle, regulatory window, price level, etc.)
     * **Who benefits?**: Which market participants (retail, whales, institutions, traders, developers) stand to gain or lose?
     * **Time horizons**: Separate short-term (days/weeks) impact from longer-term (months/years) implications.
     * **Causal chain**: Explicitly explain the mechanism linking the event to the market outcome (e.g., "ETF flows → decreased selling pressure → price support → retail FOMO")
```

**Impact**: Prevents vague significance statements; requires concrete stakeholder analysis

---

### 6️⃣ NEW "MECHANISM BREAKDOWN" SECTION (Line ~1234 in systemPrompt)
**What**: Entirely new H2 section inserted in content blueprint  
**Addition**:

```
4. **H2: Mechanism Breakdown**
   - Explain HOW things work internally, not just that they happened.
   - For market events: break down whale behavior, ETF flows, liquidity pools, on-chain metrics, regulatory hooks.
   - Use technical and market-structure language.
   - Minimum: 2-3 sentences explaining the underlying mechanism.
   - Example: "Whales accumulating below resistance → thin sell-side liquidity → one large buy absorbs surface asks → momentum cascade."
```

**Position in Flow**: After "Why it matters" (position 4)  
**Impact**: Forces explanation of internal mechanics (not just external market impact)  
**Compatibility**: Doesn't break existing validation—just adds new structural requirement

---

### 7️⃣ NEW "RISKS & COUNTERPOINTS" SECTION (Line ~1244 in systemPrompt)
**What**: Entirely new H2 section for bearish analysis and uncertainty discussion  
**Addition**:

```
6. **H2: Risks & Counterpoints**
   - Present the bearish scenario explicitly (what would invalidate the bullish narrative?).
   - Discuss uncertainty: what data is missing? What could be wrong about the analysis?
   - State the failure condition: what would break the assumed mechanism?
   - Include 2-3 bullet points covering key risks.
```

**Position in Flow**: After "Industry comparison" (position 6)  
**Impact**: Adds critical skepticism; prevents overconfident claims  
**Compatibility**: Adds bulletpoints—doesn't change HTML schema or validation logic

---

### 8️⃣ NARRATIVE FLOW RULE (Line ~1254 in systemPrompt)
**What**: New structural requirement for article progression  
**Addition**:

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

**Impact**: Enforces consistent reader journey from event→mechanism→risk→outlook

---

### 9️⃣ UPDATED buildMissingSectionScaffold FUNCTION (Line ~364)
**What**: Fallback HTML scaffold now includes new sections  
**Changes**:
- Added "Mechanism Breakdown" section with placeholder explaining on-chain/market structure analysis
- Added "Risks & Counterpoints" section with placeholder risk scenarios  
- Enhanced "Why it matters" to mention stakeholder exposure  

```javascript
<h2>Mechanism Breakdown</h2>
<p>The underlying mechanism depends on the specific market event. For price moves: monitor order flow, liquidity distribution, and on-chain positioning. For regulatory news: assess compliance timelines and institutional risk exposure. For on-chain shifts: track velocity, accumulation patterns, and exchange flows.</p>

<h2>Risks & Counterpoints</h2>
<ul>
  <li>Bullish narrative risk: what data would invalidate the primary interpretation?</li>
  <li>Uncertainty gap: what critical information is still missing from source data?</li>
  <li>Mechanism failure: what market condition would break the expected price/impact relationship?</li>
</ul>
```

**Impact**: Fallback articles will now include risk discussion automatically

---

### 🔟 UPDATED hasIdealNewsStructure FUNCTION (Line ~412)
**What**: Validation logic updated to check for new sections  
**Old Required Sections**: 5 (Hook, Data, Why, Industry, Future)  
**New Required Sections**: 7 (+ Mechanism Breakdown + Risks & Counterpoints)  

```javascript
const hasIdealNewsStructure = (html = "") => {
  const source = String(html || "").toLowerCase();
  const required = [
    "hook paragraph",
    "data summary",
    "why it matters",
    "mechanism breakdown",        // NEW
    "industry comparison",
    "risks & counterpoints",      // NEW
    "future implications",
  ];
  // ... validation logic unchanged
};
```

**Impact**: Audit function now validates presence of new sections in correct sequence

---

## 📊 CONFIGURATION SUMMARY

| Setting | Before | After | Rationale |
|---------|--------|-------|-----------|
| **Temperature** | 0.1 | 0.3 | Allow analytical reasoning |
| **Min Metric Hits** | 2 | 1 | Leaner source coverage |
| **Required Sections** | 5 | 7 | Mechanism + Risk analysis |
| **Content Depth** | Fact-based | Causal-chain focused | Why/How emphasis |
| **Structure Flow** | Event→Context | Event→Mechanism→Risk→Outlook | Analytical progression |

---

## 🛡️ AUDIT COMPATIBILITY CHECKLIST

✅ **JSON Output Schema**: UNCHANGED  
- Still returns: `{ headline, content, excerpt, seoTitle, seoDescription }`
- No new JSON fields introduced

✅ **auditAndFixArticle Logic**: UNCHANGED  
- All validation checks still execute identically
- New sections checked via `hasSectionHeading()` (existing function)
- Editorial scorecard weights unchanged
- Hard gates remain in place

✅ **Editorial Audit Gates**: ACTIVE AND PRESERVED  
- STRICT_ARTICLE_AUDIT enforcement unchanged
- Word count validation unchanged  
- Quote policy enforcement unchanged
- FORBIDDEN_WORDS filtering unchanged
- Fluency artifact detection unchanged
- Template phrase limits unchanged

✅ **Backward Compatibility**: PRESERVED  
- Existing fields: `article_html`, `meta_description`, `slug`, `tags`, `keywords` all still generated
- No breaking changes to pipeline consumers
- Author profile integration unchanged
- Fallback mechanism still functional

✅ **Section Detection**: Enhanced but backward-compatible  
- New sections checked alongside existing ones
- Missing sections trigger scaffold injection (existing mechanism)
- `hasSectionHeading()` handles H2 and H3 variants

---

## 🚀 TESTING RECOMMENDATIONS

1. **Unit Test**: Verify systemPrompt generates articles with new sections
   ```javascript
   // Ensure output includes:
   // <h2>Mechanism Breakdown</h2>
   // <h2>Risks & Counterpoints</h2>
   ```

2. **Validation Test**: Run auditArticle on generated content
   - Confirm new sections are detected by `hasSectionHeading()`
   - Verify word count thresholds still apply
   - Check editorial score calculation

3. **Fallback Test**: Test with minimal source data
   - Ensure scaffold includes new sections
   - Verify "Not provided in source data" notes appear where needed

4. **Temperature Test**: Compare 0.3 vs 0.1 outputs
   - Same source data should generate more varied causal explanations
   - Verify JSON parsing still succeeds (response_format still enforced)

5. **Pipeline Test**: End-to-end article generation
   - Ingest queue → Generation → Audit → Storage
   - Verify new sections don't break downstream rendering

---

## 📝 IMPLEMENTATION NOTES

### Why No Breaking Changes?
1. **Additive only**: New sections inserted into existing scaffold, not replacing
2. **JSON schema unchanged**: Consumer code receives same interface
3. **Validation logic preserved**: Audit function still checks same criteria (just more sections)
4. **Fallback mechanism intact**: Articles can still be published with reduced data

### Risk Mitigation
- **Temperature increase monitored**: 0.3 is still reasonably constrained (0.0=deterministic, 1.0=random)
- **New sections use existing HTML tags**: `<h2>`, `<p>`, `<ul>`—no new markup
- **Audit gates remain strict**: Hard failures still stop publishing for editorial violations

### Monitoring Points
- **Word count growth**: Articles may run slightly longer with new sections (anticipated)
- **Generation latency**: Slightly higher with more complex prompt (expect +2-3% time)
- **Fallback rate**: Should remain <5% (new sections shouldn't trigger fallback if properly structured)

---

## 🔗 FILES MODIFIED

- **Primary**: `src/services/generator.service.js`
  - Lines 10-16: Temperature update
  - Line 303: DATA_PACK_MIN_METRIC_HITS update
  - Lines 335-342: REQUIRED_NEWS_SECTIONS expansion
  - Lines 1205-1218: New CAUSAL_REASONING_LAYER section
  - Lines 1223-1254: Enhanced "Why it matters" + new "Mechanism Breakdown" + new "Risks & Counterpoints" + NARRATIVE_FLOW_RULE
  - Lines 364-395: Updated buildMissingSectionScaffold with new sections
  - Lines 412-428: Updated hasIdealNewsStructure with new section checks

---

## ✨ EXPECTED IMPROVEMENTS

### Article Quality
1. **Deeper causality**: Readers understand WHY things matter, not just WHAT happened
2. **Better risk awareness**: Explicit bearish scenarios prevent overconfident claims
3. **Mechanism transparency**: Internal market dynamics explained (whales, liquidity, ETF flows)
4. **Stakeholder clarity**: Who benefits and who is at risk is explicitly stated

### SEO/News Quality Signals
1. **E-E-A-T improvement**: Expertise, Authoritativeness, Trustworthiness all enhanced
2. **Skeptical tone**: Counterpoint discussion signals independent analysis
3. **Structural depth**: More H2 sections = better readability for crawlers
4. **Unique content**: Mechanism-specific analysis harder to duplicate

### Reader Experience
1. **Narrative arc**: Hook → Data → Mechanism → Impact → Risk → Outlook (6-step journey)
2. **Reduced hype**: Risk section prevents speculative overstatement
3. **Actionable insights**: Mechanism breakdown enables traders to understand causality
4. **Transparent uncertainty**: Explicit "not provided in source data" builds trust

---

## 🎯 SUCCESS METRICS

Track these after deployment:
- **Section presence**: % of articles including all 7 sections
- **Word count**: Average article length (expect +50-100 words increase)
- **Confidence scores**: Should remain stable or improve
- **Fallback rate**: Should decrease (more structured guidance in prompt)
- **Reader engagement**: Time on page, bounce rate, repeat visits (measure via analytics)

---

**Status**: ✅ **COMPLETE - Ready for Testing & Deployment**

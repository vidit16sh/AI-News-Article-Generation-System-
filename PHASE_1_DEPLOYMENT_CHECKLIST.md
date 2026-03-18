# 🚀 Phase 1 Deployment Checklist

**Objective:** Safely deploy Phase 1 Google News optimizations to production

**Timeline:** 2-4 hours total
**Risk Level:** ✅ Low (all changes are backward compatible, additive only)

---

## Pre-Deployment (1 hour)

### Code Quality Checks
- [ ] **Run linter/formatter:**
  ```bash
  npm run lint
  npm run format
  ```
  - Expected: No errors, only minor warnings acceptable

- [ ] **Build Next.js project:**
  ```bash
  npm run build
  ```
  - Expected: Build completes successfully with no errors
  - Expected: File: `.next/` folder created
  - Note: If using Docker, build Docker image instead

- [ ] **Check for console errors:**
  ```bash
  npm run dev
  # Navigate to http://localhost:3000/news/any-article
  # Open DevTools (F12) > Console
  ```
  - Expected: No red errors
  - Warning: Yellow warnings are okay

### Git Verification (If using version control)
- [ ] **Create feature branch:**
  ```bash
  git checkout -b feat/phase1-google-news
  ```

- [ ] **Verify only expected files changed:**
  ```bash
  git status
  # Should show only:
  # - src/app/news/[slug]/page.js
  # - src/services/generator.service.js
  # - src/app/news-sitemap.xml/route.js
  # - Documentation files (*.md)
  ```

- [ ] **Review diffs:**
  ```bash
  git diff src/app/news/[slug]/page.js
  git diff src/services/generator.service.js
  git diff src/app/news-sitemap.xml/route.js
  ```
  - Expected: Additions only (green lines), no deletions of core logic

### Environment Variables
- [ ] **Verify .env.local has required variables:**
  ```bash
  # Check these exist:
  DATABASE_URL=
  REDIS_URL=
  OPENAI_API_KEY=
  NEXT_PUBLIC_SITE_URL=https://yoursite.com
  ```
  - Note: No changes needed for Phase 1

### Database
- [ ] **Backup database (CRITICAL):**
  ```bash
  # If using PostgreSQL:
  pg_dump -h localhost -U user dbname > backup_$(date +%Y%m%d_%H%M%S).sql
  
  # Or if using Docker:
  docker exec your-postgres-container pg_dump -U user dbname > backup.sql
  ```
  - Location: Save to secure backup folder
  - Retention: Keep for 7 days minimum

---

## Staging Environment (1-2 hours)

### Deploy to Staging
- [ ] **Push to staging branch:**
  ```bash
  git push origin feat/phase1-google-news
  # or deploy to staging environment
  npm run build --prod
  npm run start
  ```

- [ ] **Verify staging deployment:**
  ```bash
  # Check staging URL loads without errors
  curl https://staging.yoursite.com/news/test-article
  ```

### Pre-Production Testing

#### Test 1: Meta Tags
- [ ] Load staging article page in browser
- [ ] Open DevTools (F12) > Elements > Head
- [ ] Verify all 5 meta tags present:
  - [ ] `article:published_time`
  - [ ] `article:modified_time`
  - [ ] `article:author`
  - [ ] `article:section`
  - [ ] `news_access="Free"`

#### Test 2: JSON-LD Schema
- [ ] Same article page, search for "application/ld+json"
- [ ] Verify JSON-LD structure:
  - [ ] `@context: "https://schema.org"`
  - [ ] `@type: "NewsArticle"`
  - [ ] `headline` field populated
  - [ ] `keywords` field has 4-8 terms
  - [ ] `author` object has `name`

#### Test 3: Keywords Coverage
- [ ] Check 5 different articles
- [ ] For each, verify:
  - [ ] Keywords array exists (4-8 items)
  - [ ] Keywords are relevant to content
  - [ ] No "undefined" or "null" values

#### Test 4: News Sitemap
- [ ] Fetch: `https://staging.yoursite.com/news-sitemap.xml`
- [ ] Verify:
  - [ ] Valid XML (no parsing errors)
  - [ ] `<news:keywords>` tag present for each article
  - [ ] Article count increased to 80+

#### Test 5: Google Rich Results Tester
- [ ] Go to: https://search.google.com/test/rich-results
- [ ] Test staging article URL (may need to make URL publicly accessible)
- [ ] Verify:
  - [ ] NewsArticle detected
  - [ ] No errors reported
  - [ ] Rich snippet preview shows correctly

### Performance Check
- [ ] **Page load time (article page):**
  ```bash
  # Check response time (should be <200ms for HTML, <2s total page)
  time curl https://staging.yoursite.com/news/test-article
  ```

- [ ] **Sitemap generation time:**
  ```bash
  # Check generation doesn't add overhead
  # Should complete in <5 seconds
  time curl https://staging.yoursite.com/news-sitemap.xml
  ```

### Monitoring Check
- [ ] **Error logging working:**
  - [ ] Check application logs for errors
  - [ ] Verify no spike in error rate
  - [ ] Database write performance normal

---

## Production Deployment (30-60 minutes)

### Pre-Production Final Check
- [ ] **All staging tests passed:** ✅
- [ ] **No new errors in logs:** ✅
- [ ] **Database backup completed:** ✅
- [ ] **Rollback plan documented** (see below)

### Database Migrations (If using Prisma)
- [ ] **Check if any Prisma migrations needed:**
  ```bash
  npx prisma migrate status
  ```
  - Expected: No pending migrations (keywords already in schema)

- [ ] **If migrations needed:**
  ```bash
  npx prisma migrate deploy
  ```

### Deploy to Production

#### Option 1: Git-based Deployment
```bash
git checkout main
git pull origin main
git merge feat/phase1-google-news
git push origin main
# Your CI/CD pipeline should automatically deploy
```

#### Option 2: Docker Deployment
```bash
docker build -t yourapp:phase1 .
docker push yourapp:phase1
# Update your deployment configuration to use this tag
docker run yourapp:phase1
```

#### Option 3: Vercel/Netlify (If using)
```bash
# The deployment should happen automatically when pushing to main
# Or manually trigger deployment in dashboard
```

### Post-Deployment Verification (First 15 minutes)
- [ ] **Site loads without errors:**
  ```bash
  curl https://yoursite.com/news/article-slug
  ```

- [ ] **No 5xx errors in logs:**
  - Check error tracking (Sentry, LogRocket, etc.)
  - Expected: No spike in error rate

- [ ] **Database queries normal:**
  - Check query logs
  - Expected: No slowdowns or timeouts

- [ ] **Meta tags present on production:**
  - Load production article in browser
  - DevTools > Head > Verify meta tags
  - Verify JSON-LD present

- [ ] **News sitemap accessible:**
  ```bash
  curl https://yoursite.com/news-sitemap.xml
  ```
  - Expected: Valid XML, 80+ articles

---

## Post-Deployment Monitoring (Week 1)

### Day 1: Immediate Monitoring
- [ ] **Error rate normal:**
  - Check error tracking dashboard
  - Expected: No unusual spikes

- [ ] **Database performance normal:**
  - Check slow query log
  - Expected: No new slow queries

- [ ] **API response time normal:**
  - Monitor article API endpoint
  - Expected: <200ms average response time

- [ ] **Search Console ready:**
  - Have admin open Google Search Console dashboard
  - Prepare to submit sitemap (step below)

### Day 1-2: Google Submission
- [ ] **Submit news sitemap to Google Search Console:**
  1. Go to https://search.google.com/search-console
  2. Select your property
  3. Navigate to "Sitemaps" (left sidebar)
  4. Enter: `https://yoursite.com/news-sitemap.xml`
  5. Click "Submit"
  6. Expected: "Submitted successfully"

- [ ] **Monitor sitemap crawl status:**
  - Come back in 24 hours
  - Check "Sitemaps" section
  - Look for: "Status: Success"

### Days 3-7: Monitoring Metrics
- [ ] **Google Search Console checks (daily):**
  - [ ] Navigate to "Coverage" section
  - [ ] Check "Covered" count (should show growth)
  - [ ] Look for any "Errors" → Investigate if any appear
  - [ ] Check "Enhancements" > "Rich Results" for NewsArticle count

- [ ] **Traffic metrics:**
  - [ ] Google Analytics: Track traffic from "google.com/news"
  - [ ] Expected: Articles start appearing in Google News feed
  - [ ] Expected: Referral traffic increases after 7 days

- [ ] **Article indexation:**
  - [ ] Check a few article URLs in Google Search Console
  - [ ] "Inspect URL" → "View crawled page"
  - [ ] Expected: Structured data shows "Valid"

### Week 1 Summary: Expected Outcomes
- ✅ 0 production errors
- ✅ Google crawled news sitemap
- ✅ 50+ articles indexed in Google News
- ✅ Articles starting to appear in Google News feed
- ✅ Traffic from Google News sources appearing

---

## Rollback Plan (If Issues Arise)

### Quick Rollback (If major issues within 1 hour)
```bash
# Option 1: Revert last commit
git revert HEAD
git push origin main

# Option 2: Deploy previous version
docker run yourapp:previous-build

# Option 3: Restore from database backup
# (Keep backup from pre-deployment step)
```

### Partial Rollback (If specific feature broken)
1. **Identify problematic file** (meta tags, JSON-LD, or keywords)
2. **Manually revert changes** in that file only
3. **Test in staging first**
4. **Deploy patch to production**

### Things NOT to Rollback
- ❌ Do NOT rollback purely because of low Google News traffic immediately after deployment
  - Google takes 7+ days to fully process articles
  - Traffic should be monitored after 1 week, not 1 hour

---

## Rollback Checklist

If you need to rollback, follow this:

- [ ] **Identify issue:**
  - Meta tags not rendering? → Issue in generateMetadata()
  - JSON-LD missing? → Issue in page.js JSON-LD section
  - Keywords blank? → Issue in generator.service.js fallback
  - Sitemap broken? → Issue in news-sitemap.xml/route.js

- [ ] **Test rollback in staging FIRST:**
  ```bash
  git revert [commit-hash] --no-edit
  npm run build
  npm run start
  # Verify it works before deploying
  ```

- [ ] **Deploy rollback to production:**
  ```bash
  git push origin main
  # CI/CD pipeline should handle deployment
  ```

- [ ] **Verify rollback successful:**
  - Article pages load at previous speed
  - No new errors in logs
  - Old meta tags still visible (or gone if they were new)

- [ ] **Post-mortem:**
  - Document what went wrong
  - Plan fix for next attempt
  - Notify team

---

## Communication & Documentation

### Before Deployment
- [ ] **Notify team:**
  - Slack message: "Deploying Phase 1 Google News optimization in 1 hour"
  - Include rollback contact info

### After Deployment
- [ ] **Update status**:
  - Slack: "Phase 1 deployed to production ✅"
  - Link to PHASE_1_IMPLEMENTATION_COMPLETE.md

- [ ] **Create monitoring task:**
  - Set reminder to check Google Search Console daily for 7 days
  - Set reminder to measure traffic impact at day 7

### Documentation Updates
- [ ] **Version control:**
  - Tag commit: `git tag -a v1.0-phase1-google-news -m "Phase 1: Google News optimization"`
  - `git push origin v1.0-phase1-google-news`

- [ ] **Update README:**
  - Document that you've implemented Google News optimizations
  - Link to PHASE_1_IMPLEMENTATION_COMPLETE.md

---

## Success Criteria

### All checks below = ✅ Successful Deployment

1. **Technical:**
   - ✅ Build completed without errors
   - ✅ Staging tests all passed
   - ✅ No production errors for 24 hours
   - ✅ Database performance normal

2. **Functional:**
   - ✅ All 5 meta tags visible on articles
   - ✅ JSON-LD renders in HTML head
   - ✅ Keywords present (4-8 per article)
   - ✅ News sitemap valid XML with 80+ articles

3. **Google Integration:**
   - ✅ News sitemap submitted to GSC
   - ✅ Google crawled sitemap successfully
   - ✅ Articles start appearing in Google Search
   - ✅ Rich Results show NewsArticle schema

4. **Monitoring:**
   - ✅ No error spikes in first 24 hours
   - ✅ GSC shows articles being crawled
   - ✅ Coverage metrics in place for week 1 tracking
   - ✅ Team notified and monitoring

---

## Quick Reference Commands

```bash
# Build
npm run build

# Test locally
npm run dev

# Linting
npm run lint

# Database backup (PostgreSQL)
pg_dump -h localhost -U user dbname > backup.sql

# Git commands
git checkout -b feat/phase1-google-news
git push origin feat/phase1-google-news
git merge feat/phase1-google-news

# Docker (if applicable)
docker build -t yourapp:phase1 .
docker run -it yourapp:phase1
```

---

## Support & Escalation

### If Meta Tags Not Showing:
1. Check page.js generateMetadata() function
2. Verify article data loading correctly
3. Check browser cache (Ctrl+Shift+Delete)
4. Inspect DevTools > head section

### If JSON-LD Missing:
1. Verify script tag present in page.js
2. Check JSON.stringify() working (no syntax errors)
3. Verify article has newsJsonLd field in DB

### If Keywords Empty:
1. Check generator.service.js fallback logic executing
2. Verify article content available for extraction
3. Check database for keywords field populated

### If Sitemap Broken:
1. Validate XML: https://www.xmlvalidation.com
2. Check quality thresholds (confidence ≥ 0.65, originality ≥ 0.55)
3. Verify keywords extraction in template

### Escalation Path:
1. Check logs for errors
2. Review PHASE_1_TESTING_GUIDE.md
3. Run validation tests
4. If still stuck, rollback and investigate

---

## Timeline Summary

```
Hour 0:   Pre-deployment checks ✓
Hour 1:   Deploy to staging & test ✓
Hour 2:   Deploy to production ✓
Hour 2.5: Immediate verification ✓
Day 1:    Submit sitemap to GSC
Days 2-7: Monitor crawl progress
Week 1:   Measure traffic impact
Week 2:   Consider Phase 2 implementation
```

---

## Final Notes

✅ **All changes are backward compatible** - No existing functionality broken
✅ **Low risk deployment** - Primarily additive changes
✅ **Quick rollback possible** - If major issues, revert single commit
✅ **Monitoring built-in** - GSC will show immediate feedback

**Status: Ready for Production Deployment**

---

**Created:** 2025-03-15
**For:** Phase 1 Google News Optimization
**Ready for:** Deployment

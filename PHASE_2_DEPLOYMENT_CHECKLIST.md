# 🚀 Phase 2 Deployment Checklist - Step-by-Step Guide

**Status:** Ready for Production Deployment  
**Date:** 2026-03-18  
**Duration:** 15-30 minutes  
**Risk Level:** ✅ LOW (Non-breaking, backward compatible)  

---

## 📋 Pre-Deployment Checklist

### Environment Check
- [ ] All code changes committed to git
- [ ] Database backup created: `pg_dump ... > backup_phase2_YYYYMMDD.sql`
- [ ] No uncommitted changes: `git status` shows clean
- [ ] All tests passing (see PHASE_2_TESTING_GUIDE.md)
- [ ] Rollback procedure documented and tested
- [ ] Team notified of deployment window

### Code Review
- [ ] Phase 2 implementation reviewed by team lead
- [ ] All changes align with ideation document
- [ ] No security concerns identified
- [ ] Performance analysis completed
- [ ] Backward compatibility verified

### Dependencies
- [ ] Node.js version compatible
- [ ] Prisma version current (`npm list prisma`)
- [ ] All packages up to date (`npm outdated`)
- [ ] No conflicts in package.json

---

## 🔄 Deployment Steps

### Step 1: Database Backup (CRITICAL - 2 minutes)

```bash
# Create backup with timestamp
BACKUP_FILE="backup_phase2_$(date +%Y%m%d_%H%M%S).sql"

# PostgreSQL backup
pg_dump \
  -h $POSTGRES_HOST \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  > $BACKUP_FILE

# Verify backup size (should be >1 MB for production)
ls -lh $BACKUP_FILE

# Expected output: 
# backup_phase2_20260318_143022.sql  5.8M
```

**✅ Confirm backup file created before proceeding**

---

### Step 2: Database Migration (CRITICAL - 3 minutes)

**BEFORE RUNNING:**
- ✅ Backup created successfully
- ✅ Database accessible
- ✅ No other migrations pending

```bash
# List pending migrations
npx prisma migrate status

# Expected output:
# 1 migration found in prisma/migrations/
# ❌ 20260318_phase2_image_metadata — current database is behind

# Apply migration
npx prisma migrate deploy

# Expected output:
# Applying migration: 20260318_phase2_image_metadata
# Migration deployed successfully ✓
```

**If Migration Fails:**
```bash
# Check for errors
npx prisma migrate resolve --rolled-back 20260318_phase2_image_metadata

# Restore from backup
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB < $BACKUP_FILE

# Contact team lead
echo "⚠️ MIGRATION FAILED - ROLLBACK COMPLETE"
```

**✅ Confirm migration deployed successfully before proceeding**

---

### Step 3: Verify Database Changes (2 minutes)

```bash
# Connect to database and verify new fields
npx prisma db execute --stdin << 'EOF'
-- Check new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'GeneratedArticle' 
  AND column_name IN ('imageAltText', 'imageCaption');

-- Expected: 2 rows (imageAltText, imageCaption)
EOF

# Check index was created
npx prisma db execute --stdin << 'EOF'
SELECT indexname FROM pg_indexes 
WHERE tablename = 'GeneratedArticle' 
  AND indexname LIKE '%imageUrl%';

-- Expected: 1 row (GeneratedArticle_imageUrl_idx)
EOF
```

**Expected Output:**
```
column_name   | data_type | is_nullable
--------------+-----------+------------
imageAltText  | text      | true
imageCaption  | text      | true

indexname
----------------------------
GeneratedArticle_imageUrl_idx
```

**✅ Confirm new columns and index created before proceeding**

---

### Step 4: Build Application (3 minutes)

```bash
# Install dependencies (if updated)
npm install

# Build Next.js application
npm run build

# Expected output:
# ✓ Compiled successfully
# ✓ Ready for production
```

**If Build Fails:**
```bash
# Check for errors
npm run build 2>&1 | tee build-error.log

# Common issues:
# - TypeScript errors: npm run type-check
# - Linting errors: npm run lint --fix

# If critical: rollback code changes
git revert HEAD
```

**✅ Confirm build completes without errors before proceeding**

---

### Step 5: Run Lint Check (2 minutes)

```bash
# Check for TypeScript/linting errors
npm run lint

# Expected output:
# No errors found ✓
```

**If Errors Found:**
```bash
# Auto-fix common issues
npm run lint --fix

# Commit fixes
git add .
git commit -m "fix: Phase 2 linting issues"
```

**✅ Confirm no linting errors before proceeding**

---

### Step 6: Test Application Locally (5 minutes)

```bash
# Start development server
npm run dev

# In browser, navigate to article page
# http://localhost:3000/news/[any-article-slug]

# Verify in DevTools:
# 1. No console errors
# 2. Image alt text visible
# 3. ImageObject schema in HTML
# 4. Author markup visible
```

**Checklist (in DevTools):**
- [ ] No 404 or error messages in console
- [ ] Page loads in <3 seconds
- [ ] Images render correctly
- [ ] Layout responsive on mobile
- [ ] Inspect elements show new attributes

**If Issues Found:**
```bash
# Check logs
tail -n 50 ~/.pm2/logs/next-app-error.log

# Rollback if needed
npm run rollback-phase2

# Contact team lead
```

**✅ Confirm local testing passes before proceeding**

---

### Step 7: Production Deployment (5-10 minutes)

#### Option A: Using PM2 (Existing Setup)
```bash
# Restart application with new code
pm2 stop next-app
pm2 start next-app

# Verify service is running
pm2 status

# Expected output:
# next-app  | online | 0
```

#### Option B: Using Docker (If containerized)
```bash
# Rebuild Docker image
docker build -t news-app:phase2 .

# Stop old container
docker stop news-app-container

# Start new container
docker run -d \
  --name news-app-container \
  -p 3000:3000 \
  --env-file .env.production \
  news-app:phase2

# Verify container running
docker ps | grep news-app-container
```

#### Option C: Direct Node.js
```bash
# Build for production
npm run build

# Start application
NODE_ENV=production node .next/standalone/server.js

# Or using process manager
pm2 restart all
```

**Expected Output:**
```
next-app  | online
Port 3000 | accessible
> Ready in 4.5s
> Listening on 0.0.0.0:3000
```

**✅ Confirm application started and accessible before proceeding**

---

### Step 8: Smoke Test - Production Validation (5 minutes)

```bash
# Test main endpoints
PROD_URL="https://yourdomain.com"

# 1. Homepage loads
curl -I $PROD_URL/
# Expected: HTTP 200

# 2. Article page loads
curl -I $PROD_URL/news/sample-article
# Expected: HTTP 200

# 3. New fields in HTML
curl $PROD_URL/news/sample-article | \
  grep -o 'itemType="https://schema.org/ImageObject"' | wc -l
# Expected: ≥1

# 4. JSON-LD contains image description
curl $PROD_URL/news/sample-article | \
  grep -o '"description"' | wc -l
# Expected: ≥1

# 5. Author schema present
curl $PROD_URL/news/sample-article | \
  grep -o 'itemType="https://schema.org/Person"' | wc -l
# Expected: ≥2
```

**Quick Validation Script:**
```bash
#!/bin/bash
PROD_URL="https://yourdomain.com"
ARTICLE="/news/sample-article"

echo "Phase 2 Production Validation:"
echo "==============================="

# Test 1
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $PROD_URL$ARTICLE)
echo "✅ Article page loads: $HTTP_CODE"

# Test 2
IMAGEOBJECT=$(curl -s $PROD_URL$ARTICLE | grep -c 'ImageObject')
echo "✅ ImageObject schema: $IMAGEOBJECT found"

# Test 3
PERSON=$(curl -s $PROD_URL$ARTICLE | grep -c 'schema.org/Person')
echo "✅ Person schema: $PERSON found"

# Test 4
DESCRIPTION=$(curl -s $PROD_URL$ARTICLE | grep -c '"description"')
echo "✅ Description fields: $DESCRIPTION found"

echo ""
echo "Validation Complete ✓"
```

**✅ All smoke tests pass before moving to final verification**

---

### Step 9: Final Verification with Google Tools (5 minutes)

**Google Rich Results Tester:**
1. Go to https://search.google.com/test/rich-results
2. Enter production URL: `https://yourdomain.com/news/sample-article`
3. Click "Inspect URL"
4. Verify results:
   - [ ] ✅ NewsArticle detected
   - [ ] ✅ Image with description detected
   - [ ] ✅ Author detected (if available)
   - [ ] ✅ No validation errors
   - [ ] ✅ No warnings

**Mobile-Friendly Test:**
1. Go to https://search.google.com/test/mobile-friendly
2. Enter same URL
3. Verify: Mobile friendly ✅

**Schema.org Validator:**
1. Go to https://validator.schema.org/
2. Paste article page HTML
3. Verify: No errors, valid NewsArticle schema

**Screenshot Results:**
```bash
# Save results for documentation
mkdir -p deployment-validation/
# Take screenshot of:
# - Rich Results page
# - Mobile-friendly result
# - Schema validator result
# Save in: deployment-validation/phase2-validation-[date].png
```

**✅ All validation tools show no errors before declaring deployment complete**

---

## 🎯 Post-Deployment Checklist

### Monitoring (First 24 Hours)

```bash
# Monitor application logs
pm2 logs next-app --lines 100

# Check error rate
# Dashboard: https://yourdomain.com/admin/monitoring

# Database performance
# Query count: SELECT COUNT(*) FROM GeneratedArticle WHERE imageAltText IS NOT NULL;
# Expected: Increasing count as new articles generated

# Monitor these metrics:
# - Error rate: Should be 0% new errors
# - Response time: Should be <3s for article pages
# - Image generation: Should complete successfully
```

### First New Article Verification

```bash
# After deploying, generate/publish a new article
# Check that:
# [ ] imageAltText is populated
# [ ] imageCaption is populated (if set)
# [ ] HTML contains ImageObject schema
# [ ] JSON-LD contains description
# [ ] Google Rich Results validates
```

### Sign-off & Documentation

```markdown
# Phase 2 Deployment Complete

**Date:** [DATE]
**Time:** [TIME]
**Deployed by:** [YOUR_NAME]
**Status:** ✅ SUCCESSFUL

## Verification Results
- Database migration: ✅ Applied
- Code deployed: ✅ Version [HASH]
- Smoke tests: ✅ All passed
- Google validation: ✅ No errors
- Performance: ✅ Stable

## Rollback Backup
Location: `backup_phase2_[TIMESTAMP].sql`
Status: Verified & ready if needed

## Next Steps
- Monitor logs for 24 hours
- Track analytics for image traffic increase
- Plan Phase 3 implementation
```

---

## ⚠️ Rollback Procedures

### Quick Rollback (If Critical Issue)

**Step 1: Stop Application**
```bash
pm2 stop next-app
```

**Step 2: Revert Code Changes**
```bash
git revert HEAD --no-edit
npm install
npm run build
```

**Step 3: Restore Database**
```bash
# If migration needs reversal
npx prisma migrate resolve --rolled-back 20260318_phase2_image_metadata
```

**Step 4: Restart Application**
```bash
pm2 start next-app
```

**Expected Recovery Time:** <5 minutes

### Full Rollback (Restore from Backup)

```bash
# Only if data was corrupted
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB < backup_phase2_YYYYMMDD.sql

# Restart application
pm2 restart next-app

# Verify backup restored
curl https://yourdomain.com/api/health
```

**Note:** Use only if data integrity issue detected

---

## 📊 Deployment Tracking

### Timeline Template
```
[14:00] - Pre-deployment checks started
[14:05] - Database backup created (5.8 MB)
[14:08] - Database migration deployed
[14:10] - Database validation passed
[14:13] - Build completed successfully
[14:15] - Linting checks passed
[14:20] - Local testing passed
[14:25] - Production deployment started
[14:30] - Smoke tests passed
[14:35] - Google validation passed
[14:35] - ✅ DEPLOYMENT COMPLETE
```

### Issue Log Template
```
Time: [HH:MM]
Severity: LOW/MEDIUM/HIGH/CRITICAL
Issue: [DESCRIPTION]
Resolution: [WHAT WAS DONE]
Status: RESOLVED/ESCALATED
```

---

## 🚨 Emergency Contacts

In case of critical issues during deployment:

```
Team Lead: [NAME] - [PHONE/SLACK]
DevOps: [NAME] - [PHONE/SLACK]
Database Admin: [NAME] - [PHONE/SLACK]

Escalation: #emergency-deployments Slack channel
```

---

## ✅ Deployment Sign-Off

### Before Deployment
**I confirm that I have completed:**
- [ ] All pre-deployment checks
- [ ] Code review and testing
- [ ] Database backup creation
- [ ] Rollback procedure testing

**Deployment authorized by:** _________________ **Date:** _______

### After Deployment
**I confirm that I have completed:**
- [ ] Database migration deployed successfully
- [ ] Application built and running
- [ ] All smoke tests passed
- [ ] Google validation successful
- [ ] Monitoring enabled for 24 hours

**Deployment completed by:** _________________ **Date:** _______

**Status:** ✅ PRODUCTION READY

---

## 📚 Related Documentation

- `PHASE_2_IMPLEMENTATION_COMPLETE.md` - Technical deep-dive
- `PHASE_2_TESTING_GUIDE.md` - Validation procedures
- `PHASE_2_QUICK_REFERENCE.md` - Quick summary
- `PHASE_1_IMPLEMENTATION_COMPLETE.md` - Previous phase

---

## 🎯 Success Criteria

### Minimum Requirements for Successful Deployment:
1. ✅ Database migration completes without errors
2. ✅ No new console/server errors introduced
3. ✅ New articles have imageAltText populated
4. ✅ ImageObject schema visible in HTML
5. ✅ Google Rich Results validates with no errors
6. ✅ Application performance stable (response time <3s)
7. ✅ Rollback backup available and tested

### All criteria met = **PHASE 2 DEPLOYMENT SUCCESSFUL** ✅

---

**Deployment Checklist Version:** 1.0  
**Updated:** 2026-03-18  
**Status:** READY FOR PRODUCTION DEPLOYMENT  

**Next Phase:** Phase 3 (Advanced Improvements) - To be scheduled after Phase 2 stabilization

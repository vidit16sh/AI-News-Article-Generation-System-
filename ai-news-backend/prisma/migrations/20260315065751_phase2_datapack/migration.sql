-- CreateTable
CREATE TABLE "SourceReliability" (
    "id" SERIAL NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "fetchRuns" INTEGER NOT NULL DEFAULT 0,
    "fetchSuccessRuns" INTEGER NOT NULL DEFAULT 0,
    "scrapeAttempts" INTEGER NOT NULL DEFAULT 0,
    "scrapeSuccesses" INTEGER NOT NULL DEFAULT 0,
    "savedItems" INTEGER NOT NULL DEFAULT 0,
    "blockedItems" INTEGER NOT NULL DEFAULT 0,
    "avgContentLength" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "publishConversion" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "lastRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceReliability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestDiagnostic" (
    "id" SERIAL NOT NULL,
    "service" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "sourceKey" TEXT,
    "sourceUrl" TEXT,
    "rawNewsId" TEXT,
    "cleanedNewsId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestDiagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceReliability_sourceKey_key" ON "SourceReliability"("sourceKey");

-- CreateIndex
CREATE INDEX "IngestDiagnostic_reasonCode_createdAt_idx" ON "IngestDiagnostic"("reasonCode", "createdAt");

-- CreateIndex
CREATE INDEX "IngestDiagnostic_sourceKey_createdAt_idx" ON "IngestDiagnostic"("sourceKey", "createdAt");

-- CreateIndex
CREATE INDEX "CleanedNews_createdAt_idx" ON "CleanedNews"("createdAt");

-- CreateIndex
CREATE INDEX "CleanedNews_publishedAt_idx" ON "CleanedNews"("publishedAt");

-- CreateIndex
CREATE INDEX "GeneratedArticle_status_createdAt_idx" ON "GeneratedArticle"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RawNews_processed_publishedAt_idx" ON "RawNews"("processed", "publishedAt");

-- CreateIndex
CREATE INDEX "RawNews_publishedAt_idx" ON "RawNews"("publishedAt");

-- CreateIndex
CREATE INDEX "RawNews_fetchedAt_idx" ON "RawNews"("fetchedAt");

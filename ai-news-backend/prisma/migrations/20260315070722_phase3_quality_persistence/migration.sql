-- AlterTable
ALTER TABLE "GeneratedArticle" ADD COLUMN     "dataPackUsed" JSONB,
ADD COLUMN     "editorialScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qualityScorecard" JSONB;

/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sourceUrl]` on the table `CleanedNews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Category_name_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CleanedNews_sourceUrl_key" ON "CleanedNews"("sourceUrl");

-- CreateIndex
CREATE INDEX "GeneratedArticle_status_publishAt_idx" ON "GeneratedArticle"("status", "publishAt");

-- CreateIndex
CREATE INDEX "GeneratedArticle_slug_idx" ON "GeneratedArticle"("slug");

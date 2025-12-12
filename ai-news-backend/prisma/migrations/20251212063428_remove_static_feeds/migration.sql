/*
  Warnings:

  - You are about to drop the column `rssEntry` on the `GeneratedArticle` table. All the data in the column will be lost.
  - You are about to drop the column `sitemapEntry` on the `GeneratedArticle` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GeneratedArticle" DROP COLUMN "rssEntry",
DROP COLUMN "sitemapEntry";

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawNews" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rawBody" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RawNews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanedNews" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleanedNews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingLog" (
    "id" SERIAL NOT NULL,
    "newsId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "email" TEXT,
    "twitter" TEXT,
    "linkedin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedArticle" (
    "id" TEXT NOT NULL,
    "originalNewsId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "articleHtml" TEXT NOT NULL,
    "tags" TEXT[],
    "keywords" TEXT[],
    "imageUrl" TEXT,
    "rssEntry" TEXT,
    "sitemapEntry" TEXT,
    "newsJsonLd" JSONB,
    "originalityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RawNews_sourceUrl_key" ON "RawNews"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedArticle_originalNewsId_key" ON "GeneratedArticle"("originalNewsId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedArticle_slug_key" ON "GeneratedArticle"("slug");

-- AddForeignKey
ALTER TABLE "CleanedNews" ADD CONSTRAINT "CleanedNews_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedArticle" ADD CONSTRAINT "GeneratedArticle_originalNewsId_fkey" FOREIGN KEY ("originalNewsId") REFERENCES "CleanedNews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedArticle" ADD CONSTRAINT "GeneratedArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

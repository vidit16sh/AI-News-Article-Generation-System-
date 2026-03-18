-- Phase 2: Add image metadata fields for accessibility and SEO
-- Purpose: Support descriptive alt text and image captions for Google Images, Vision API, and accessibility

ALTER TABLE "GeneratedArticle" ADD COLUMN "imageAltText" TEXT;
ALTER TABLE "GeneratedArticle" ADD COLUMN "imageCaption" TEXT;

-- Create index for faster metadata queries
CREATE INDEX "GeneratedArticle_imageUrl_idx" ON "GeneratedArticle"("imageUrl");

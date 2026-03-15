import 'dotenv/config';
import prisma from '../lib/prisma.js';

const MIN_CONFIDENCE = Number(process.env.PUBLISHER_MIN_CONFIDENCE || process.env.GEN_MIN_CONFIDENCE || 0.65);
const MIN_EDITORIAL = Number(process.env.PUBLISHER_MIN_EDITORIAL_SCORE || process.env.GEN_MIN_EDITORIAL_SCORE || 75);
const MIN_WORD_COUNT = Number(process.env.PUBLISHER_MIN_WORD_COUNT || process.env.GEN_MIN_WORD_COUNT || 450);
const DRY_RUN = (process.env.DRY_RUN || 'true') === 'true';

const countWordsFromHtml = (html = '') =>
  String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;

const isFallbackLikeContent = (html = '') => {
  const plain = String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const markers = [
    'developing story: details are still emerging',
    'coinmarketbuzz analysts are reviewing the details and will update this analysis shortly',
    'market update',
  ];

  return markers.filter((m) => plain.includes(m)).length >= 2;
};

const shouldQuarantine = (article) => {
  const confidence = Number(article.confidenceScore || 0);
  const editorial = Number(article.editorialScore || 0);
  const words = countWordsFromHtml(article.articleHtml || '');
  const fallbackLike = isFallbackLikeContent(article.articleHtml || '');

  return (
    confidence < MIN_CONFIDENCE ||
    editorial < MIN_EDITORIAL ||
    words < MIN_WORD_COUNT ||
    fallbackLike
  );
};

const main = async () => {
  const candidates = await prisma.generatedArticle.findMany({
    where: { status: { in: ['PUBLISHED', 'QUEUED'] } },
    select: {
      id: true,
      slug: true,
      status: true,
      confidenceScore: true,
      editorialScore: true,
      articleHtml: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const flagged = candidates.filter(shouldQuarantine);
  if (!flagged.length) {
    console.log('No low-quality articles found.');
    return;
  }

  console.log(`Found ${flagged.length} low-quality queued/published article(s).`);
  flagged.slice(0, 20).forEach((a) => {
    console.log(`- ${a.slug} [${a.status}]`);
  });

  if (DRY_RUN) {
    console.log('DRY_RUN=true, no database changes applied.');
    return;
  }

  const ids = flagged.map((a) => a.id);
  const result = await prisma.generatedArticle.updateMany({
    where: { id: { in: ids } },
    data: { status: 'DRAFT' },
  });

  console.log(`Quarantined ${result.count} article(s) to DRAFT.`);
};

main()
  .catch((err) => {
    console.error('quarantine-low-quality failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


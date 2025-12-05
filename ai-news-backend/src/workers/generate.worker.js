import 'dotenv/config';
import Bottleneck from 'bottleneck';
import stringSimilarity from 'string-similarity'; // Ensure npm install string-similarity
import { connectRabbit } from '../config/rabbit.js';
import prisma from '../lib/prisma.js';
import { generateArticle } from '../services/generator.service.js';
import { generateImage } from '../services/image.service.js'; 
const limiter = new Bottleneck({
    minTime: 2000000, 
    maxConcurrent: 1 
});


// Helper: Check Originality
const calculateOriginality = (aiText, sourceText) => {
    if (!sourceText || sourceText.length < 50) return 1.0;
    const similarity = stringSimilarity.compareTwoStrings(aiText, sourceText);
    return Math.round((1.0 - similarity) * 100) / 100; // Inverse of similarity
};

// Helper: Revalidate Cache
const triggerRevalidation = async (tag) => {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        // Fire and forget - don't await response to speed up worker
        fetch(`${apiUrl}/api/revalidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': process.env.API_SECRET_KEY
            },
            body: JSON.stringify({ tag })
        }).catch(() => {}); 
    } catch (error) {
        // Ignore
    }
}; 

const createJsonLd = (article, url) => ({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": url
    },
    "headline": article.headline,
    "description": article.meta_description || article.headline, // Critical for SEO
    "image": article.imageUrl ? [article.imageUrl] : [], // Safety check
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString(), // Google prefers seeing this
    "author": { 
        "@type": "Organization", 
        "name": "AI News Desk" 
    },
    "publisher": {
        "@type": "Organization",
        "name": "AI News Platform", // Replace with your actual Site Name
        "logo": {
            "@type": "ImageObject",
            "url": "http://localhost:3000/logo.png" // Replace with your actual logo URL
        }
    }
});


const createRssEntry = (article, url) => `
<item>
  <title><![CDATA[${article.headline}]]></title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <pubDate>${new Date().toUTCString()}</pubDate>
  <description><![CDATA[${article.meta_description}]]></description>
  ${article.imageUrl ? `<enclosure url="${article.imageUrl}" length="0" type="image/jpeg" />` : ''}
  <category><![CDATA[${article.tags?.[0] || 'News'}]]></category>
  <dc:creator>AI News Desk</dc:creator>
</item>`; 

const createSitemapEntry = (url) => `
<url>
  <loc>${url}</loc>
  <lastmod>${new Date().toISOString()}</lastmod>
  <changefreq>daily</changefreq>
  <priority>0.7</priority>
</url>`;

const processGenerationJob = async (msg, channel) => {
    const content = JSON.parse(msg.content.toString());
    const { newsId, priorityScore = 50 } = content;

    console.log(`\n📝 [Gen-Worker] Processing Job: ${newsId}`);

    try {
        const cleanNews = await prisma.cleanedNews.findUnique({
            where: { id: newsId },
            include: { category: true }
        });

        if (!cleanNews) {
            channel.ack(msg);
            return;
        }

        // Idempotency Check
        const existing = await prisma.generatedArticle.findUnique({
            where: { originalNewsId: newsId }
        });
        if (existing) {
            channel.ack(msg);
            return;
        }

        // 1. Generate Text
        console.log(`   🧠 Writing: "${cleanNews.title.substring(0, 30)}..."`);
        const aiOutput = await limiter.schedule(() => generateArticle(cleanNews));

        // 2. Generate Image
        console.log(`   🎨 Generating Image (Fal.ai)...`);
        const imageUrl = await generateImage(aiOutput.headline);
        
        if (!imageUrl) console.warn("   ⚠️ Image generation failed (Key issue?)."); 

        // 3. Score Originality
        const realOriginalityScore = calculateOriginality(aiOutput.article_html, cleanNews.content);
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const fullUrl = `${baseUrl}/news/${aiOutput.slug}`; 
        
        const newsJsonLd = createJsonLd({ ...aiOutput, imageUrl }, fullUrl);
        const rssEntry = createRssEntry(aiOutput, fullUrl);
        const sitemapEntry = createSitemapEntry(fullUrl);

        // 4. Determine Status
        let status = "DRAFT";
        let publishAt = new Date();
        const isHighQuality = aiOutput.confidence >= 0.85 && realOriginalityScore >= 0.20; 
        
        if (isHighQuality) {
        if (priorityScore >= 90) {
            // 🚨 BREAKING NEWS: Publish Immediately
            status = "PUBLISHED";
            console.log(`   🚨 BREAKING NEWS DETECTED (Score: ${priorityScore}) - Publishing NOW.`);
        } else if (priorityScore >= 50) {
            // 🕒 STANDARD NEWS: Queue it
            status = "QUEUED";
            console.log(`   🕒 Standard News (Score: ${priorityScore}) - Queued for Drip Feed.`);
        } else {
            // 🗑️ LOW VALUE: Keep as Draft
            status = "DRAFT";
            console.log(`   🗑️ Low Value (Score: ${priorityScore}) - Saved as Draft.`);
            }
        }

        // 5. Save
        await prisma.generatedArticle.create({
            data: {
                headline: aiOutput.headline,
                slug: aiOutput.slug,
                metaDescription: aiOutput.meta_description,
                articleHtml: aiOutput.article_html,
                
                tags: aiOutput.tags || [], 
                keywords: aiOutput.keywords || [],
                
                imageUrl: imageUrl,
                
                rssEntry: rssEntry,         // ✅ Populated
                sitemapEntry: sitemapEntry, // ✅ Populated
                newsJsonLd: newsJsonLd,
                
                originalityScore: realOriginalityScore,
                confidenceScore: aiOutput.confidence || 0, 
                priorityScore: priorityScore,
                
                status: status,
                
                publishAt: publishAt,
                
                originalNewsId: cleanNews.id
            }
        });

        console.log(`   ✨ Finished: ${aiOutput.slug} [${status}]`);

    if (status === 'PUBLISHED') {
        await triggerRevalidation('articles');
    }
        channel.ack(msg);

    } catch (err) {
        console.error(`   ❌ Worker Error: ${err.message}`);
        if (err.message.includes('429')) {
             setTimeout(() => channel.nack(msg), 5000);
        } else {
             channel.ack(msg);
        }
    }
};

const startGenWorker = async () => {
    const channel = await connectRabbit();
    await channel.assertQueue('generation_queue', { durable: true });
    channel.prefetch(1); 
    console.log("🚀 Gen Worker Started...");
    channel.consume('generation_queue', (msg) => {
        if (msg) processGenerationJob(msg, channel);
    });
};

startGenWorker();
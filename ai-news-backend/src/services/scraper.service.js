// src/services/scraper.service.js - PRODUCTION GRADE
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 1. Enable Stealth Mode (Bypasses Cloudflare/403s)
puppeteer.use(StealthPlugin());

// ⚡ GLOBAL BROWSER INSTANCE (Singleton Pattern)
let sharedBrowser = null;

const getBrowser = async () => {
    if (sharedBrowser) return sharedBrowser;

    console.log("🚀 Launching Shared Browser...");
    sharedBrowser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', 
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--disable-infobars',
            '--disable-extensions'
        ]
    });

    sharedBrowser.on('disconnected', () => {
        console.log("⚠️ Browser disconnected! Resetting...");
        sharedBrowser = null;
    });

    return sharedBrowser;
};

export const scrapeArticle = async (url) => {
    console.log(`🕷️ Scraping: ${url}`);
    
    let page = null;
    let browser = null;

    try {
        browser = await getBrowser();
        page = await browser.newPage();
        
        // Update to a more modern, realistic User Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // Resource Blocking (Optimized for News sites)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const rType = req.resourceType();
            if (['image', 'media', 'font'].includes(rType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // 5. Navigate - Changed to 'networkidle2' to allow Cloudflare/Scripts to settle
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

        // 6. Handle Google Redirects SECURELY
        if (page.url().includes('news.google.com')) {
            console.log("⏳ Waiting for Google Redirect...");
            try {
                // Wait for hostname to change away from google
                await page.waitForFunction(
                    () => !window.location.hostname.includes('news.google.com'),
                    { timeout: 15000 }
                );
            } catch (e) {
                // FIXED: Removed the "Fallback click" that was hitting Price Converters
                console.log("   ⚠️ Redirect timeout. Skipping to avoid landing on junk pages.");
                await page.close();
                return null;
            }
        }

        const finalUrl = page.url();
        
        // 🛡️ JUNK URL FILTER: Immediately skip if we landed on a non-article page
        const junkPatterns = ['/price-converter/', '/tag/', '/author/', '/category/', '/login'];
        if (junkPatterns.some(pattern => finalUrl.toLowerCase().includes(pattern))) {
            console.log(`   🗑️  Landed on junk page: ${finalUrl}. Skipping.`);
            await page.close();
            return null;
        }

        console.log(`✅ Landed on: ${finalUrl}`);

        // Wait for React hydration
        try {
            await page.waitForSelector('article p, .article-content p, .post-content p', { timeout: 8000 });
        } catch (e) {}

        // 8. Extract Content
        const content = await page.evaluate(() => {
            // Remove common junk
            const junkSelectors = [
                'nav', 'footer', 'script', 'style', 'noscript', 'iframe',
                '.ad', '.advertisement', '.subscribe', '.cookie-banner', 
                'header', 'aside', '[aria-label="cookieconsent"]', '.sidebar'
            ];
            junkSelectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));

            const contentSelectors = [
                '.post-content',             
                '[class*="Post_content"]',   
                '.article-body',             
                '.ArticleBody-articleBody',  
                'article',                   
                '#article-content',
                'main'
            ];

            for (const sel of contentSelectors) {
                const el = document.querySelector(sel);
                if (el && el.innerText.length > 500) {
                    return el.innerText;
                }
            }
            
            const paragraphs = Array.from(document.querySelectorAll('p'))
                .map(p => p.innerText)
                .filter(text => text.length > 60);
            
            return paragraphs.join('\n\n');
        });

        await page.close();
        
        const cleaned = (content || "").replace(/\s+/g, ' ').trim();
        
        if (cleaned.length < 300) {
            console.log(`⚠️ Content too short (${cleaned.length} chars). Skipping.`);
            return null;
        }

        return { content: cleaned, url: finalUrl };

    } catch (err) {
        console.error(`❌ Scraping Error: ${err.message}`);
        if (page && !page.isClosed()) try { await page.close(); } catch (e) {}

        if (err.message.includes('Target closed') || err.message.includes('Session closed')) {
            if (sharedBrowser) {
                try { await sharedBrowser.close(); } catch (e) {}
                sharedBrowser = null;
            }
        }
        return null;
    }
};
// src/services/scraper.service.js - PRODUCTION GRADE (OPTIMIZED)
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 1. Enable Stealth Mode (Bypasses Cloudflare/403s)
puppeteer.use(StealthPlugin());

// ⚡ GLOBAL BROWSER INSTANCE (Recycling Singleton Pattern)
let sharedBrowser = null;
let scrapeCounter = 0;
const BROWSER_RECYCLE_LIMIT = 50; // Resets every 50 articles to prevent RAM leaks

const getBrowser = async () => {
    // ✅ DEFENSIVE RECYCLING: Check if limit hit OR if browser connection is lost
    const isLimitReached = scrapeCounter >= BROWSER_RECYCLE_LIMIT;
    const isDisconnected = sharedBrowser && !sharedBrowser.isConnected();

    if (sharedBrowser && (isLimitReached || isDisconnected)) {
        console.log(isLimitReached ? "♻️ Recycling Browser (Limit Hit)..." : "⚠️ Browser disconnected! Resetting...");
        try {
            // Only attempt to close if it's still technically connected
            if (sharedBrowser.isConnected()) {
                await sharedBrowser.close();
            }
        } catch (e) {
            console.error("⚠️ Error during browser cleanup:", e.message);
        }
        sharedBrowser = null;
        scrapeCounter = 0;
    }

    if (sharedBrowser) return sharedBrowser;

    console.log("🚀 Launching Optimized fresh Chromium instance...");
    sharedBrowser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Prevents crashes in Docker/Linux
            '--disable-gpu',           // Saves significant RAM
            '--no-zygote',             // Reduces background process overhead
            '--disable-extensions',
            '--single-process',        // Drastically lowers memory footprint
            '--no-first-run',
            '--window-size=1920,1080'
        ]
    });

    return sharedBrowser;
};

export const scrapeArticle = async (url) => { 
    scrapeCounter++;
    let page = null;
    console.log(`🕷️ Scraping (#${scrapeCounter}): ${url}`);
    
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        // Use a modern User Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // ✅ RESOURCE BLOCKING (Optimized for News sites - Saves RAM/Bandwidth)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const rType = req.resourceType();
            if (['image', 'media', 'font', 'stylesheet'].includes(rType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // ✅ SPEED TWEAK: Changed to 'domcontentloaded' to avoid waiting for slow tracking scripts
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        // 6. Handle Google Redirects SECURELY
        if (page.url().includes('news.google.com')) {
            console.log("⏳ Waiting for Google Redirect...");
            try {
                await page.waitForFunction(
                    () => !window.location.hostname.includes('news.google.com'),
                    { timeout: 15000 }
                );
            } catch (e) {
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

        // Wait for basic content structure
        try {
            await page.waitForSelector('p', { timeout: 8000 });
        } catch (e) {}

        // 8. Extract Content (Your original logic preserved)
        const content = await page.evaluate(() => {
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
        
        // Cleanup page
        if (page && !page.isClosed()) {
            try { await page.close(); } catch (e) {}
        }

        // ✅ AUTO-RECOVERY: If browser crashes, kill the reference so getBrowser() starts a new one
        if (err.message.includes('Target closed') || err.message.includes('Session closed') || err.message.includes('disconnected')) {
            sharedBrowser = null;
        }
        return null;
    }
};
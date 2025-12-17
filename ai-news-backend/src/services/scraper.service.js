import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 1. Enable Stealth Mode (Bypasses Cloudflare/403s)
puppeteer.use(StealthPlugin());

// ⚡ GLOBAL BROWSER INSTANCE (Singleton Pattern)
// This prevents launching 100 Chrome instances and crashing your server.
let sharedBrowser = null;

const getBrowser = async () => {
    if (sharedBrowser) return sharedBrowser;

    console.log("🚀 Launching Shared Browser...");
    sharedBrowser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Vital for Docker/Server
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--window-size=1920,1080',
        ]
    });

    // Reset if it crashes
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
        // 2. Reuse the existing browser (Fast & Efficient)
        browser = await getBrowser();
        page = await browser.newPage();
        
        // 3. Set Desktop User Agent (Vital for Decrypt/CoinDesk)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // 4. Resource Blocking (Speeds it up)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const rType = req.resourceType();
            const rUrl = req.url().toLowerCase();

            // Block media/fonts but ALLOW scripts (Decrypt needs scripts to load text)
            if (['image', 'media', 'font'].includes(rType) || 
                rUrl.includes('google-analytics') || 
                rUrl.includes('doubleclick')) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // 5. Navigate
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        // 6. Handle Google Redirects
        if (page.url().includes('news.google.com')) {
            console.log("⏳ Detected Google Redirect. Waiting for target...");
            try {
                await page.waitForFunction(
                    () => !window.location.hostname.includes('news.google.com'),
                    { timeout: 15000 }
                );
            } catch (e) {
                // Fallback click
                try {
                    const link = await page.$('a[href^="http"]');
                    if (link) await link.click();
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
                } catch (err) {}
            }
        }

        const finalUrl = page.url();
        console.log(`✅ Landed on: ${finalUrl}`);

        // ⚡ 7. THE DECRYPT FIX: Wait for Content to Hydrate
        // Decrypt is a React app. The HTML is empty until JS runs.
        // We wait up to 5 seconds for any paragraph to appear in an article tag.
        try {
            await page.waitForSelector('article p', { timeout: 5000 });
        } catch (e) {
            // Ignore timeout (some sites aren't React)
        }

        // 8. Extract Content
        const content = await page.evaluate(() => {
            // Remove junk
            const junkSelectors = [
                'nav', 'footer', 'script', 'style', 'noscript', 'iframe',
                '.ad', '.advertisement', '.subscribe', '.cookie-banner', 
                'header', 'aside', '[aria-label="cookieconsent"]'
            ];
            junkSelectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));

            // Smart Selector List
            const contentSelectors = [
                '.post-content',             // Decrypt (Primary)
                '[class*="Post_content"]',   // Decrypt (Dynamic Class)
                '.article-body',             // Coindesk
                '.ArticleBody-articleBody',  // CNBC
                'article',                   // Generic HTML5
                '#article-content',
                'main'
            ];

            for (const sel of contentSelectors) {
                const el = document.querySelector(sel);
                // Check if it actually contains text
                if (el && el.innerText.length > 500) {
                    return el.innerText;
                }
            }
            
            // Fallback: Get all substantial paragraphs
            const paragraphs = Array.from(document.querySelectorAll('p'))
                .map(p => p.innerText)
                .filter(text => text.length > 60); // Only keep sentences
            
            return paragraphs.join('\n\n');
        });

        // 9. Close Page (Keep Browser Open)
        await page.close();
        
        const cleaned = (content || "").replace(/\s+/g, ' ').trim();
        
        if (cleaned.length < 200) {
            console.log(`⚠️ Content too short (${cleaned.length} chars). Skipping.`);
            return null;
        }

        return { content: cleaned, url: finalUrl };

    } catch (err) {
        console.error(`❌ Scraping Error: ${err.message}`);
        
        if (page && !page.isClosed()) try { await page.close(); } catch (e) {}

        // If the browser itself crashed, reset the singleton
        if (err.message.includes('Target closed') || err.message.includes('Session closed')) {
            console.log("🔄 Browser crashed. Resetting singleton...");
            if (sharedBrowser) {
                try { await sharedBrowser.close(); } catch (e) {}
                sharedBrowser = null;
            }
        }
        
        return null;
    }
};
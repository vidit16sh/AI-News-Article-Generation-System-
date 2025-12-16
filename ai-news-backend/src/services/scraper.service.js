import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 1. Enable Stealth Mode (Bypasses Cloudflare/403s)
puppeteer.use(StealthPlugin());

export const scrapeArticle = async (url) => {
    console.log(`   🕷️  Scraping: ${url}`);
    
    let browser = null;
    try {
        // 2. Launch with "Crash-Proof" Args
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Vital for stability
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // 3. Set a Real User Agent (Double protection)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
            req.continue();
            }
        });
        // 4. Navigate (Wait for network idle to ensure JS loads)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 5. If it's a Google Redirect, Puppeteer will follow it naturally.
        // We get the FINAL URL to verify source.
        const finalUrl = page.url(); 

        // 6. Extract Content (Smart Selectors)
        const content = await page.evaluate(() => {
            // Remove junk
            const junk = document.querySelectorAll('nav, footer, script, style, .ad, .advertisement, .promo');
            junk.forEach(el => el.remove());

            // Try specific selectors for Crypto sites first
            const selectors = [
                '.article-body',       // Coindesk
                '.post-content',       // Decrypt / General WordPress
                '.content-style',      // Some crypto blogs
                'article',             // Standard HTML5
                'main'                 // Fallback
            ];

            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.innerText.length > 500) {
                    return el.innerText;
                }
            }
            return document.body.innerText; // Absolute fallback
        });

        await browser.close();
        
        // 7. Cleaning
        const cleaned = content.replace(/\s+/g, ' ').trim();
        if (cleaned.length < 200) {
            console.log(`   ⚠️  Content too short (${cleaned.length} chars). Skipping.`);
            return null;
        }

        return { content: cleaned, url: finalUrl };

    } catch (err) {
        console.error(`   ❌ Scraping Error: ${err.message}`);
        if (browser) await browser.close();
        return null;
    }
};
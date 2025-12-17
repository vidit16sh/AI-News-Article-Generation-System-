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
                '--disable-dev-shm-usage', // Vital for stability in Docker
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu',
                '--single-process' // Keeps memory usage low
            ]
        });

        const page = await browser.newPage();
        
        // 3. Set a Real User Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 4. Enhanced Resource Blocking (Fixes Timeouts on heavy sites like CNBC)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const rType = req.resourceType();
            const rUrl = req.url().toLowerCase();

            // Block media/fonts/styles AND common trackers/ads to save bandwidth/time
            if (
                ['image', 'stylesheet', 'font', 'media', 'other'].includes(rType) ||
                rUrl.includes('google-analytics') ||
                rUrl.includes('doubleclick') ||
                rUrl.includes('facebook') ||
                rUrl.includes('/ads/') ||
                rUrl.includes('tr.') 
            ) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // 5. Navigate (Wait for DOM, max 60s)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 6. Freeze JS Execution
        // This stops the page from loading more ads/videos after we have the text.
        try {
            await page.setJavaScriptEnabled(false);
        } catch (e) {
            // Ignore error if page is already closed
        }

        // 7. Get Final URL (Resolves Google News Redirects)
        const finalUrl = page.url(); 

        // 8. Extract Content (Smart Selectors)
        const content = await page.evaluate(() => {
            // Remove junk elements
            const junkSelectors = [
                'nav', 'footer', 'script', 'style', 'noscript', 'iframe',
                '.ad', '.advertisement', '.promo', '.subscribe', '.newsletter',
                '.cookie-banner', '#cookie-banner', '.header', '.footer', 
                'aside', '.social-share'
            ];
            
            junkSelectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => el.remove());
            });

            // Priority Selectors for Crypto/News Sites
            const contentSelectors = [
                '.article-body',            // Coindesk
                '.post-content',            // Decrypt
                '.ArticleBody-articleBody', // CNBC (Critical Add)
                '.content-style',           // General
                'article',                  // HTML5 Standard
                '#article-content',
                '.story-content',
                'main'
            ];

            for (const sel of contentSelectors) {
                const el = document.querySelector(sel);
                // Check if element exists and has substantial text
                if (el && el.innerText.length > 500) {
                    return el.innerText;
                }
            }
            
            // Absolute Fallback
            return document.body.innerText;
        });

        await browser.close();
        browser = null; // Prevent double closing in catch
        
        // 9. Cleaning & Validation
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
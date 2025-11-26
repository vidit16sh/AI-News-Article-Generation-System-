import axios from 'axios';
import * as cheerio from 'cheerio'; // Cheerio works best with 'import * as'
import UserAgent from 'user-agents';

export const scrapeArticle = async (url) => {
    try {
        console.log(`   🕷️  Scraping full text: ${url}`);
        
        // 1. Fetch the HTML with a fake User-Agent (to avoid blocking)
        const userAgent = new UserAgent();
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': userAgent.toString() },
            timeout: 10000 // 10s timeout
        });

        // 2. Load into Cheerio
        const $ = cheerio.load(data);

        // 3. Select the article body
        // These selectors work for CoinDesk, Decrypt, and WatcherGuru
        let content = "";
        
        // CoinDesk specific
        $('.at-text, .content-style, .article-body').each((i, el) => {
            content += $(el).text() + "\n\n";
        });

        // Decrypt / WatcherGuru / General Fallback
        if (content.length < 100) {
            $('article p, .post-content p').each((i, el) => {
                content += $(el).text() + "\n\n";
            });
        }

        // 4. Clean up
        content = content.replace(/\s+/g, ' ').trim();

        // Fallback if scraping fails
        if (content.length < 50) return null;

        return content;

    } catch (err) {
        console.error(`   ⚠️  Scraping failed for ${url}: ${err.message}`);
        return null;
    }
};

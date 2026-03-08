import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

let sharedBrowser = null;
let browserLaunchPromise = null;
let scrapeCounter = 0;
let activeScrapes = 0;

const BROWSER_RECYCLE_LIMIT = 50;
const BLOCKED_RESOURCES = new Set(['image', 'media', 'font', 'stylesheet']);
const JUNK_PATTERNS = ['/price-converter/', '/tag/', '/author/', '/category/', '/login', '/signup'];
const DOMAIN_SELECTORS = {
  'coindesk.com': [
    '[data-testid="article-body"]',
    '.at-content-wrapper',
    '.article-content',
  ],
  'cointelegraph.com': [
    '.post__content-wrapper',
    '.post-content',
    '.post__content',
  ],
};

const selectorsForHost = (host = '') => {
  const domainEntries = Object.entries(DOMAIN_SELECTORS);
  for (const [domain, selectors] of domainEntries) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return selectors;
    }
  }
  return [];
};

const closeBrowser = async (reason = 'cleanup') => {
  if (!sharedBrowser) return;

  console.log(`Recycling browser (${reason})...`);
  try {
    if (sharedBrowser.isConnected()) {
      await sharedBrowser.close();
    }
  } catch (error) {
    console.error('Browser cleanup error:', error.message);
  } finally {
    sharedBrowser = null;
    browserLaunchPromise = null;
    scrapeCounter = 0;
  }
};

const maybeRecycleBrowser = async () => {
  if (sharedBrowser && scrapeCounter >= BROWSER_RECYCLE_LIMIT && activeScrapes === 0) {
    await closeBrowser('recycle-limit');
  }
};

const getBrowser = async () => {
  const isDisconnected = sharedBrowser && !sharedBrowser.isConnected();
  if (isDisconnected) {
    await closeBrowser('disconnected');
  }

  if (sharedBrowser) return sharedBrowser;
  if (browserLaunchPromise) return browserLaunchPromise;

  console.log('Launching optimized Chromium instance...');
  browserLaunchPromise = puppeteer
    .launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--disable-extensions',
        '--no-first-run',
        '--window-size=1920,1080',
      ],
    })
    .then((browser) => {
      sharedBrowser = browser;
      browserLaunchPromise = null;
      return browser;
    })
    .catch((error) => {
      browserLaunchPromise = null;
      throw error;
    });

  return browserLaunchPromise;
};

export const scrapeArticle = async (url) => {
  activeScrapes++;
  let page = null;
  console.log(`Scraping: ${url}`);

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (BLOCKED_RESOURCES.has(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    if (page.url().includes('news.google.com')) {
      try {
        await page.waitForFunction(() => !window.location.hostname.includes('news.google.com'), {
          timeout: 15000,
        });
      } catch {
        await page.close();
        return null;
      }
    }

    const finalUrl = page.url();
    const host = (() => {
      try {
        return new URL(finalUrl).hostname.replace(/^www\./, '').toLowerCase();
      } catch {
        return '';
      }
    })();
    if (JUNK_PATTERNS.some((pattern) => finalUrl.toLowerCase().includes(pattern))) {
      await page.close();
      return null;
    }

    try {
      await page.waitForSelector('p', { timeout: 8000 });
    } catch {}

    const content = await page.evaluate(({ domainSelectors }) => {
      const junkSelectors = [
        'nav',
        'footer',
        'script',
        'style',
        'noscript',
        'iframe',
        '.ad',
        '.advertisement',
        '.subscribe',
        '.cookie-banner',
        'header',
        'aside',
        '[aria-label="cookieconsent"]',
        '.sidebar',
      ];
      junkSelectors.forEach((sel) => document.querySelectorAll(sel).forEach((el) => el.remove()));

      const contentSelectors = [
        ...(Array.isArray(domainSelectors) ? domainSelectors : []),
        '.post-content',
        '[class*="Post_content"]',
        '.article-body',
        '.ArticleBody-articleBody',
        'article',
        '#article-content',
        'main',
      ];

      for (const sel of contentSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.length > 500) return el.innerText;
      }

      const paragraphs = Array.from(document.querySelectorAll('p'))
        .map((p) => p.innerText)
        .filter((text) => text.length > 60);

      return paragraphs.join('\n\n');
    }, { domainSelectors: selectorsForHost(host) });

    await page.close();
    scrapeCounter++;

    const cleaned = (content || '').replace(/\s+/g, ' ').trim();
    if (cleaned.length < 300) return null;

    return { content: cleaned, url: finalUrl };
  } catch (error) {
    console.error(`Scraping error: ${error.message}`);
    if (page && !page.isClosed()) {
      try {
        await page.close();
      } catch {}
    }

    if (
      error.message.includes('Target closed') ||
      error.message.includes('Session closed') ||
      error.message.includes('disconnected')
    ) {
      await closeBrowser('renderer-crash');
    }
    return null;
  } finally {
    activeScrapes--;
    await maybeRecycleBrowser();
  }
};

for (const signal of ['SIGINT', 'SIGTERM', 'beforeExit']) {
  process.on(signal, async () => {
    await closeBrowser(`signal-${signal}`);
  });
}

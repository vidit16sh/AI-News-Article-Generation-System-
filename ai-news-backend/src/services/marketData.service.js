import axios from 'axios';
const COIN_MAP = {
  'bitcoin': 'bitcoin', 'btc': 'bitcoin',
  'ethereum': 'ethereum', 'eth': 'ethereum',
  'solana': 'solana', 'sol': 'solana',
  'ripple': 'ripple', 'xrp': 'ripple',
  'dogecoin': 'dogecoin', 'doge': 'dogecoin',
  'cardano': 'cardano', 'ada': 'cardano',
  'binance': 'binancecoin', 'bnb': 'binancecoin',
  'pepe': 'pepe', 'shiba': 'shiba-inu', 'shib': 'shiba-inu',
  'avalanche': 'avalanche-2', 'avax': 'avalanche-2',
  'chainlink': 'chainlink', 'link': 'chainlink'
}; 

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

// 1. Fetch Crypto Fear & Greed Index (Free API)
const getFearAndGreed = async () => {
    try {
        const { data } = await axios.get('https://api.alternative.me/fng/', { headers: HEADERS });
        const item = data.data[0];
        return { value: item.value, classification: item.value_classification };
    } catch (e) { return null; }
}; 

// 2. Identify Coin from Text
const identifyCoin = (text) => {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(COIN_MAP)) {
        // Regex ensures we match "Solana" but not "Solanar"
        if (new RegExp(`\\b${key}\\b`, 'i').test(lowerText)) {
            return value;
        }
    }
    return null; // No specific coin found
};

// 3. Main Data Aggregator (For AI Text Injection)
export const getEnrichedMarketData = async (text) => {
    try {
        let injectionString = "### 📊 REAL-TIME MARKET INTELLIGENCE:\n";
        const coinId = identifyCoin(text);
        
        const sentiment = await getFearAndGreed();
        if (sentiment) {
            injectionString += `- **Global Crypto Sentiment:** "${sentiment.classification}" (Score: ${sentiment.value}/100).\n`;
        }

        if (coinId) {
            const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h`;
            const { data } = await axios.get(url, { headers: HEADERS });
            const coin = data[0];

            if (coin) {
                injectionString += `
- **Asset Focused:** ${coin.name} (${coin.symbol.toUpperCase()})
- **Current Price:** $${coin.current_price.toLocaleString()}
- **24h Trend:** ${coin.price_change_percentage_24h.toFixed(2)}%
- **Market Rank:** #${coin.market_cap_rank}\n`;
            }
        } else {
            const btcUrl = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`;
            const { data } = await axios.get(btcUrl, { headers: HEADERS });
            if (data.bitcoin) {
                injectionString += `- **Market Proxy (Bitcoin):** $${data.bitcoin.usd} (${data.bitcoin.usd_24h_change.toFixed(2)}% 24h).\n`;
            }
        }
        return injectionString;
    } catch (error) {
        console.error("📊 Market Data Axios Error:", error.message);
        return null; 
    }
};

// 4. Generate Chart Image URL (The Visual Alpha)
export const generateChartUrl = async (text) => {
    try {
        const coinId = identifyCoin(text);
        if (!coinId) return null;

        const [chartRes, coinRes] = await Promise.all([
            axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`, { headers: HEADERS }),
            axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`, { headers: HEADERS })
        ]);

        const prices = chartRes.data.prices.map(p => p[1]);
        const currentPrice = coinRes.data[coinId].usd;
        const change24h = coinRes.data[coinId].usd_24h_change;
        
        const step = Math.ceil(prices.length / 40);
        const cleanPrices = prices.filter((_, i) => i % step === 0);
        const isBullish = change24h >= 0;

        const chartConfig = {
            type: 'line',
            data: {
                labels: cleanPrices.map((_, i) => i),
                datasets: [{
                    data: cleanPrices,
                    borderColor: isBullish ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                    backgroundColor: isBullish ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 4, pointRadius: 0, fill: true, tension: 0.4
                }]
            },
            options: {
                legend: { display: false },
                title: { display: true, text: [`${coinId.toUpperCase()} • $${currentPrice.toLocaleString()}`, `${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}% (7D Trend)`], fontColor: '#ffffff', fontSize: 24 }
            }
        };

        return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=1200&height=630&backgroundColor=%23111827`;
    } catch (e) {
        console.error("📈 Chart Axios Error:", e.message);
        return null;
    }
};
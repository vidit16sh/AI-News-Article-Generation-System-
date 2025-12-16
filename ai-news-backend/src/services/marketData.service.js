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

// 1. Fetch Crypto Fear & Greed Index (Free API)
const getFearAndGreed = async () => {
    try {
        const res = await fetch('https://api.alternative.me/fng/');
        const data = await res.json();
        const item = data.data[0];
        return {
            value: item.value,
            classification: item.value_classification // e.g., "Extreme Greed"
        };
    } catch (e) {
        return null;
    }
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
        let injectionString = "### 📊 REAL-TIME MARKET INTELLIGENCE (Inject this data):\n";
        const coinId = identifyCoin(text);
        
        // A. Get Sentiment (Always useful)
        const sentiment = await getFearAndGreed();
        if (sentiment) {
            injectionString += `- **Global Crypto Sentiment:** "${sentiment.classification}" (Score: ${sentiment.value}/100). Use this to set the tone of the market analysis.\n`;
        }

        // B. Get Deep Coin Data (If coin identified)
        if (coinId) {
            // Fetch extended data: Price, Vol, Change, ATH, High/Low 24h
            const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h`;
            
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const coin = data[0];

                if (coin) {
                    const isPump = coin.price_change_percentage_24h > 5;
                    const isDump = coin.price_change_percentage_24h < -5;
                    
                    injectionString += `
- **Asset Focused:** ${coin.name} (${coin.symbol.toUpperCase()})
- **Current Price:** $${coin.current_price.toLocaleString()}
- **24h Trend:** ${coin.price_change_percentage_24h.toFixed(2)}% ${isPump ? "🚀 (Strong Rally)" : isDump ? "⚠️ (Significant Correction)" : "(Consolidating)"}
- **24h Range:** Low: $${coin.low_24h.toLocaleString()} / High: $${coin.high_24h.toLocaleString()}
- **Volume:** $${(coin.total_volume / 1000000).toFixed(1)} Million
- **Distance from ATH:** ${coin.ath_change_percentage.toFixed(2)}% (ATH was $${coin.ath.toLocaleString()})
- **Market Rank:** #${coin.market_cap_rank}
`;
                }
            }
        } else {
            // If no specific coin, fetch Bitcoin as a market proxy
            const btcUrl = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`;
            const btcRes = await fetch(btcUrl);
            const btcData = await btcRes.json();
            if (btcData.bitcoin) {
                injectionString += `- **Market Proxy (Bitcoin):** $${btcData.bitcoin.usd} (${btcData.bitcoin.usd_24h_change.toFixed(2)}% 24h). Use this to describe the general market direction.\n`;
            }
        }

        return injectionString;

    } catch (error) {
        console.error("Market Data Error:", error.message);
        return null; 
    }
};

// 4. Generate Chart Image URL (The Visual Alpha)
export const generateChartUrl = async (text) => {
    try {
        const coinId = identifyCoin(text);
        if (!coinId) return null;

        // A. Fetch Data (Price + 24h Change info for the header)
        const [chartRes, coinRes] = await Promise.all([
            fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`),
            fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`)
        ]);

        const chartData = await chartRes.json();
        const coinData = await coinRes.json();

        if (!chartData.prices || chartData.prices.length === 0) return null;

        // B. Process Data
        const prices = chartData.prices.map(p => p[1]);
        const timestamps = chartData.prices.map(p => p[0]);
        const currentPrice = coinData[coinId].usd;
        const change24h = coinData[coinId].usd_24h_change;
        
        // Downsample to ~40 points for a smooth curve
        const step = Math.ceil(prices.length / 40);
        const cleanPrices = prices.filter((_, i) => i % step === 0);
        const cleanLabels = timestamps.filter((_, i) => i % step === 0)
            .map(ts => new Date(ts).toLocaleDateString('en-US', {weekday: 'short'}));

        // Trend Logic
        const isBullish = change24h >= 0;
        const color = isBullish ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'; // Green-500 or Red-500
        const bgColor = isBullish ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';

        // C. Construct QuickChart Config (The "TradingView" Look)
        const chartConfig = {
            type: 'line',
            data: {
                labels: cleanLabels,
                datasets: [{
                    label: 'Price',
                    data: cleanPrices,
                    borderColor: color,
                    backgroundColor: bgColor,
                    borderWidth: 3,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                layout: { padding: { top: 20, bottom: 20, left: 20, right: 20 } },
                legend: { display: false },
                title: {
                    display: true,
                    text: [
                        `${coinId.toUpperCase()} • $${currentPrice.toLocaleString()}`, // Line 1: Ticker + Price
                        `${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}% (7 Days)` // Line 2: Change
                    ],
                    fontColor: '#ffffff',
                    fontSize: 24,
                    fontStyle: 'bold',
                    padding: 20
                },
                scales: {
                    xAxes: [{
                        gridLines: { display: false },
                        ticks: { fontColor: '#9ca3af', fontSize: 10, maxRotation: 0 }
                    }],
                    yAxes: [{
                        gridLines: { color: '#374151', borderDash: [5, 5] }, // Dashed grid
                        ticks: {
                            fontColor: '#9ca3af',
                            fontSize: 11,
                            callback: (val) => '$' + val.toLocaleString()
                        }
                    }]
                }
            }
        };

        // Dark Mode Background URL
        return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=1200&height=630&backgroundColor=%23111827`;

    } catch (e) {
        console.error("Chart Error:", e.message);
        return null;
    }
};
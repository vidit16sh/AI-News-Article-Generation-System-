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
        if (!coinId) return null; // No coin identified, cannot make a chart

        // A. Fetch 7 days of price data (Sparkline data)
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`);
        const data = await res.json();
        
        if (!data.prices || data.prices.length === 0) return null;

        // B. Process Data (Downsample for cleaner chart)
        // CoinGecko returns hourly data for 7 days (~168 points). QuickChart handles ~20-30 best.
        const prices = data.prices.map(p => p[1]);
        const timestamps = data.prices.map(p => p[0]);
        
        // Filter to keep roughly 1 point per 6-8 hours
        const filterStep = Math.ceil(prices.length / 24); 
        const cleanPrices = prices.filter((_, i) => i % filterStep === 0);
        const cleanLabels = timestamps.filter((_, i) => i % filterStep === 0)
                                      .map(ts => new Date(ts).toLocaleDateString('en-US', {weekday:'short'}));

        // Determine Trend Color (Green if up over 7 days, Red if down)
        const startPrice = cleanPrices[0];
        const endPrice = cleanPrices[cleanPrices.length - 1];
        const isGreen = endPrice >= startPrice;
        
        // C. Construct QuickChart URL
        const chartConfig = {
            type: 'line',
            data: {
                labels: cleanLabels,
                datasets: [{
                    label: `${coinId.toUpperCase()} (7D)`,
                    data: cleanPrices,
                    borderColor: isGreen ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)', // Green or Red
                    backgroundColor: isGreen ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', // Light fill
                    borderWidth: 3,
                    pointRadius: 0, // Clean line without dots
                    fill: true,
                    lineTension: 0.4 // Smooth curves
                }]
            },
            options: {
                title: { 
                    display: true, 
                    text: `${coinId.toUpperCase()} Price Action (7 Days)`,
                    fontSize: 20,
                    fontColor: '#111',
                    padding: 10
                },
                legend: { display: false },
                scales: {
                    xAxes: [{ 
                        gridLines: { display: false },
                        ticks: { fontSize: 10, fontColor: '#666' }
                    }],
                    yAxes: [{ 
                        gridLines: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { 
                            fontSize: 10, 
                            fontColor: '#666',
                            callback: (val) => '$' + val.toLocaleString() 
                        }
                    }]
                }
            }
        };

        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=800&height=400&backgroundColor=white`;
        
        return chartUrl;

    } catch (e) {
        console.error("Chart Generation Error:", e.message);
        return null;
    }
};
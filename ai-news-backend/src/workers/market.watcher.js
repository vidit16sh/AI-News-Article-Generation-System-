import 'dotenv/config';
import WebSocket from 'ws';
import { connectRabbit } from '../config/rabbit.js';
import prisma from '../lib/prisma.js'; 
import { classifyNews, getOrCreateCategory } from '../services/classifier.service.js';

// ⚙️ CONFIGURATION
const WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@kline_1m';
const THRESHOLD_PRICE_CHANGE = 0.8; // 0.8% move in 1 minute is still very fast/scary
const THRESHOLD_VOLUME_BTC = 15;  // Minimum 15 BTC volume in 1 min to count as "Real" (avoids scam wicks)
const RECONNECT_INTERVAL = 5000;    // 5 Seconds

let ws;
let channel;

const startMarketWatcher = async () => {
    try {
        // Ensure RabbitMQ Connection Persists
        if (!channel) {
            channel = await connectRabbit();
            await channel.assertQueue('generation_queue', { durable: true });
        }

        console.log("🐋 Market Watchdog Started (Free Version)...");
        connectWebSocket();

    } catch (error) {
        console.error("❌ Fatal Watcher Error:", error);
        setTimeout(startMarketWatcher, RECONNECT_INTERVAL);
    }
};

const connectWebSocket = () => {
    ws = new WebSocket(WS_URL);

    ws.on('open', () => {
        console.log('   ✅ Connected to Binance Stream');
    });

    ws.on('message', async (data) => {
        try {
            const json = JSON.parse(data);
            const k = json.k; // Kline object

            // Only process when candle closes (k.x = true)
            if (k && k.x) { 
                const open = parseFloat(k.o);
                const close = parseFloat(k.c);
                const volume = parseFloat(k.v);
                
                const percentChange = ((close - open) / open) * 100;
                const absChange = Math.abs(percentChange);

                // 🧠 LOGIC: Price must move X% AND Volume must be > Y
                // This filters out "low liquidity wicks" which are noise.
                const isSignificantVolume = volume > THRESHOLD_VOLUME_BTC;
                const isBigMove = absChange >= THRESHOLD_PRICE_CHANGE;

                if (isBigMove && isSignificantVolume) {
                    const direction = percentChange > 0 ? "SURGES" : "CRASHES";
                    const headline = `🚨 MARKET ALERT: Bitcoin ${direction} by ${absChange.toFixed(2)}% in 1 Minute!`;
                    
                    console.log(`\n🚀 DETECTED VOLATILITY: ${headline} [Vol: ${volume.toFixed(2)} BTC]`);

                    await triggerAlert(headline, open, close, volume);
                }
            }
        } catch (err) {
            console.error('   ⚠️ Message Processing Error:', err.message);
        }
    });

    ws.on('close', () => {
        console.warn('   ⚠️ Binance Connection Closed. Reconnecting...');
        setTimeout(connectWebSocket, RECONNECT_INTERVAL);
    });

    ws.on('error', (err) => {
        console.error('   ❌ WebSocket Error:', err.message);
        ws.close(); // Trigger 'close' event to reconnect
    });
};

const triggerAlert = async (headline, open, close, volume) => {
    try {
        // 1. Deduplication (Prevent spamming the same crash)
        const lastAlert = await prisma.cleanedNews.findFirst({
            where: { 
                title: { contains: "MARKET ALERT" },
                publishedAt: { gt: new Date(Date.now() - 30 * 60 * 1000) } // 30 min cooldown
            }
        });

        if (lastAlert) {
            console.log("   Info: Alert skipped (Cooldown active)");
            return;
        }
        
        const classification = await classifyNews(headline, `Bitcoin Market Alert Vol: ${volume}`);
        const category = await getOrCreateCategory(classification.category_slug);
        
        // 2. Create "Artificial" News Item
        
        const saved = await prisma.cleanedNews.create({
            data: {
                title: headline,
                summary: `Bitcoin just experienced extreme volatility, moving from $${open.toLocaleString()} to $${close.toLocaleString()} in a single minute. Volume recorded: ${volume.toFixed(2)} BTC. This indicates a major liquidity event.`,
                content: `(Auto-Generated Market Alert) Bitcoin spot markets on Binance recorded a significant move. The asset opened the minute at $${open} and closed at $${close}, representing a volatility spike of over ${THRESHOLD_PRICE_CHANGE}%. High volume suggests institutional activity.`,
                sourceUrl: `https://binance.com/btc-volatility-${Date.now()}`,
                status: 'PENDING',
                category: { connect: { id: category.id } }, // Ensure this category exists in DB!
                publishedAt: new Date()
            }
        });

        // 3. Push to Generator with HIGH PRIORITY
        if (channel) {
            channel.sendToQueue('generation_queue', Buffer.from(JSON.stringify({
                newsId: saved.id,
                priorityScore: 95 // 🚨 Highest priority (Skips Queue)
            })));
            console.log("   ➡️ Alert Sent to Generator Queue");
        }

    } catch (e) {
        console.error("   ❌ Failed to trigger alert:", e.message);
    }
};

startMarketWatcher();
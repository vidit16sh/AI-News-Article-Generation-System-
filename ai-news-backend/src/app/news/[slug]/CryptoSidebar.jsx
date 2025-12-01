"use client";

import { useEffect, useState } from "react";

const COINS = [
  { symbol: "btcusdt", name: "Bitcoin", ticker: "BTC" },
  { symbol: "ethusdt", name: "Ethereum", ticker: "ETH" },
  { symbol: "bnbusdt", name: "BNB", ticker: "BNB" },
  { symbol: "xrpusdt", name: "XRP", ticker: "XRP" },
  { symbol: "solusdt", name: "Solana", ticker: "SOL" },
  { symbol: "dogeusdt", name: "Dogecoin", ticker: "DOGE" },
];

function formatPrice(num) {
  if (!num || Number.isNaN(num)) return "—";
  if (num >= 1000)
    return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (num >= 1)
    return num.toLocaleString("en-US", { maximumFractionDigits: 3 });
  return num.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function formatChange(change) {
  if (change === null || change === undefined || Number.isNaN(change)) return "—";
  const s = change.toFixed(2);
  return `${change > 0 ? "+" : ""}${s}%`;
}

// Build a simple sparkline path in a 100x40 viewBox based on history array
function buildSparklinePath(history) {
  if (!history || history.length === 0) return "";

  const n = history.length;
  if (n === 1) {
    return "M0 20 L100 20";
  }

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history.map((value, index) => {
    const x = (index / (n - 1)) * 100;
    const norm = (value - min) / range;
    const y = 40 - norm * 36 - 2; // padding
    return { x, y };
  });

  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L${points[i].x} ${points[i].y}`;
  }
  return d;
}

export default function CryptoSidebar() {
  const [coinState, setCoinState] = useState(() => {
    const initial = {};
    COINS.forEach((c) => {
      initial[c.symbol] = {
        lastPrice: null,
        changePercent: null,
        history: [],
      };
    });
    return initial;
  });

  const [fearGreed, setFearGreed] = useState({
    value: null,
    classification: "",
    isLoading: true,
  });

  // 1) Fetch sparkline history for the last 24h (1h candles)
  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        await Promise.all(
          COINS.map(async (coin) => {
            try {
              const res = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${coin.symbol.toUpperCase()}&interval=1h&limit=24`
              );
              const data = await res.json();
              if (!Array.isArray(data) || cancelled) return;

              const closes = data
                .map((candle) => parseFloat(candle[4]))
                .filter((v) => !Number.isNaN(v));

              if (!closes.length) return;

              setCoinState((prev) => ({
                ...prev,
                [coin.symbol]: {
                  ...prev[coin.symbol],
                  history: closes,
                },
              }));
            } catch {
              // ignore per-coin failure
            }
          })
        );
      } catch {
        // ignore global failure
      }
    }

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Binance WebSocket for live prices & 24h % change (chart stays 1D)
  useEffect(() => {
    const streams = COINS.map((c) => `${c.symbol}@miniTicker`).join("/");
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${streams}`
    );

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (!message?.data) return;

        const { s, c, P } = message.data; // symbol, last price, % change
        const key = s.toLowerCase();

        const coinExists = COINS.some((coin) => coin.symbol === key);
        if (!coinExists) return;

        const lastPrice = parseFloat(c);
        const changePercent = parseFloat(P);

        setCoinState((prev) => {
          const existing = prev[key] || { history: [] };
          // DO NOT change history here – keep it as 1D snapshot
          return {
            ...prev,
            [key]: {
              ...existing,
              lastPrice,
              changePercent,
            },
          };
        });
      } catch {
        // silently ignore malformed messages
      }
    };

    ws.onerror = () => {
      // optional: could add fallback polling
    };

    return () => {
      ws.close();
    };
  }, []);

  // 3) Fear & Greed Index (Alternative.me)
  useEffect(() => {
    let cancelled = false;

    async function fetchFearGreed() {
      try {
        const res = await fetch("https://api.alternative.me/fng/?limit=1");
        const json = await res.json();
        const item = json?.data?.[0];

        if (!item || cancelled) return;

        setFearGreed({
          value: Number(item.value),
          classification: item.value_classification,
          isLoading: false,
        });
      } catch {
        if (!cancelled) {
          setFearGreed((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }

    fetchFearGreed();

    const id = setInterval(fetchFearGreed, 1000 * 60 * 5); // every 5 mins

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const fgValue = fearGreed.value ?? 0;
  const fgBarWidth = Math.min(100, Math.max(0, fgValue));

  const fgColor =
    fgValue < 20
      ? "bg-red-500"
      : fgValue < 40
      ? "bg-orange-500"
      : fgValue < 60
      ? "bg-yellow-400"
      : fgValue < 80
      ? "bg-lime-500"
      : "bg-emerald-500";

  return (
    <div className="space-y-4">
      {/* Live Prices – 6 coins, 2 per row, card style */}
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Live Prices
          </h2>
          <span className="text-[10px] font-medium text-slate-400">
            Powered by Binance
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {COINS.map((coin) => {
            const state = coinState[coin.symbol] || {};
            const change = state.changePercent;
            const isUp = typeof change === "number" && change > 0;
            const isDown = typeof change === "number" && change < 0;

            const sparkPath = buildSparklinePath(state.history);

            const changeClass = isUp
              ? "text-emerald-600"
              : isDown
              ? "text-red-600"
              : "text-slate-500";

            const chipBg = isUp
              ? "bg-emerald-50"
              : isDown
              ? "bg-red-50"
              : "bg-slate-50";

            // Decide line color explicitly (no Tailwind stroke utilities)
            const strokeColor = isUp
              ? "#16a34a" // emerald-600
              : isDown
              ? "#dc2626" // red-600
              : "#94a3b8"; // slate-400

            return (
              <div
                key={coin.symbol}
                className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm"
              >
                {/* Top row: logo + text block (prevents overflow) */}
                <div className="mb-1 flex items-center gap-2">
                  {/* Logo chip (replace with real logo image if you want) */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                    {coin.ticker}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-semibold text-slate-900">
                        {coin.ticker}
                      </span>
                      <span className="max-w-[70px] truncate text-[10px] font-mono text-slate-700">
                        ${formatPrice(state.lastPrice)}
                      </span>
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {coin.name}
                    </div>
                  </div>
                </div>

                {/* Sparkline – last 24h */}
                <div className="mt-1">
                  {sparkPath ? (
                    <svg
                      viewBox="0 0 100 40"
                      preserveAspectRatio="none"
                      className="h-8 w-full"
                    >
                      <path
                        d={sparkPath}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <div className="h-8 w-full rounded-full bg-slate-100" />
                  )}
                </div>

                {/* Change chip */}
                <div className="mt-1 flex items-center gap-1">
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${chipBg} ${changeClass}`}
                  >
                    {isDown && <span className="mr-0.5">▼</span>}
                    {isUp && <span className="mr-0.5">▲</span>}
                    {formatChange(change)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Fear & Greed Index */}
      <section className="rounded-3xl border border-slate-200 bg-slate-950 text-slate-50 shadow-sm">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Market Sentiment
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Crypto Fear &amp; Greed Index
          </p>
        </div>

        <div className="px-4 py-4">
          {fearGreed.isLoading ? (
            <p className="text-[11px] text-slate-400">Loading sentiment…</p>
          ) : fearGreed.value == null ? (
            <p className="text-[11px] text-slate-400">
              Sentiment unavailable right now.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">
                    Current Index
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-semibold">{fgValue}</span>
                    <span className="text-[11px] text-slate-400">/ 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">
                    Mood
                  </div>
                  <div className="text-xs font-semibold text-slate-50">
                    {fearGreed.classification}
                  </div>
                </div>
              </div>

              {/* Simple horizontal gauge */}
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-[9px] text-slate-400">
                  <span>Extreme Fear</span>
                  <span>Neutral</span>
                  <span>Extreme Greed</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className={`h-2 rounded-full ${fgColor} transition-all duration-500`}
                    style={{ width: `${fgBarWidth}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

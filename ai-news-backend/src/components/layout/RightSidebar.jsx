"use client";

import { useEffect, useState } from "react";

// Coins to show in the sidebar
const COINS = [
  { symbol: "BTCUSDT", name: "Bitcoin", ticker: "BTC" },
  { symbol: "ETHUSDT", name: "Ethereum", ticker: "ETH" },
  { symbol: "SOLUSDT", name: "Solana", ticker: "SOL" },
  { symbol: "XRPUSDT", name: "Ripple", ticker: "XRP" },
];

const HISTORY_LENGTH = 24; // ~1 day with 1h candles
const REFRESH_MS = 60000; // refresh prices + history every 60s

export default function RightSidebar() {
  const [coins, setCoins] = useState(() =>
    COINS.map((c) => ({
      ...c,
      price: null,
      change24h: null,
      isUp: null,
      history: [],
    }))
  );

  const [fearGreed, setFearGreed] = useState({
    value: null,
    classification: "",
    updatedAt: "",
  });

  /* ---------- Live prices + 1D history ---------- */
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const results = await Promise.all(
          COINS.map(async (coin) => {
            const [tickerRes, klinesRes] = await Promise.all([
              fetch(
                `https://api.binance.com/api/v3/ticker/24hr?symbol=${coin.symbol}`
              ),
              fetch(
                `https://api.binance.com/api/v3/klines?symbol=${coin.symbol}&interval=1h&limit=${HISTORY_LENGTH}`
              ),
            ]);

            const ticker = tickerRes.ok ? await tickerRes.json() : null;
            const klines = klinesRes.ok ? await klinesRes.json() : null;

            return { coin, ticker, klines };
          })
        );

        if (cancelled) return;

        setCoins((prev) =>
          prev.map((prevCoin) => {
            const match = results.find(
              (r) => r.coin.symbol === prevCoin.symbol
            );
            if (!match) return prevCoin;

            const { ticker, klines } = match;

            let price = prevCoin.price;
            let changePercent = prevCoin.change24h;

            if (ticker) {
              const p = parseFloat(ticker.lastPrice);
              const c = parseFloat(ticker.priceChangePercent);
              if (Number.isFinite(p)) price = p;
              if (Number.isFinite(c)) changePercent = c;
            }

            let history = prevCoin.history;
            if (Array.isArray(klines) && klines.length) {
              const closes = klines
                .map((k) => parseFloat(k[4])) // close price is index 4
                .filter((v) => Number.isFinite(v));
              if (closes.length >= 2) {
                history = closes;
              }
            }

            const isUp = Number.isFinite(changePercent)
              ? changePercent >= 0
              : prevCoin.isUp;

            return {
              ...prevCoin,
              price,
              change24h: changePercent,
              isUp,
              history,
            };
          })
        );
      } catch (err) {
        console.error("Error fetching Binance data:", err);
      }
    }

    fetchData();
    const id = setInterval(fetchData, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  /* ---------- Fear & Greed Index ---------- */
  useEffect(() => {
    let cancelled = false;

    async function fetchFearGreed() {
      try {
        const res = await fetch(
          "https://api.alternative.me/fng/?limit=1&format=json"
        );
        if (!res.ok) return;

        const json = await res.json();
        const item = json?.data?.[0];
        if (!item || cancelled) return;

        const value = parseInt(item.value, 10);
        setFearGreed({
          value: Number.isFinite(value) ? value : null,
          classification: item.value_classification || "",
          updatedAt: item.timestamp ? new Date(item.timestamp * 1000) : "",
        });
      } catch (err) {
        console.error("Error fetching Fear & Greed Index:", err);
      }
    }

    fetchFearGreed();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-light text-slate-900">
          Live Crypto Snapshot
        </h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">
          24h
        </span>
      </div>

      {/* 2 cards per row inside narrow sidebar */}
      <div className="grid grid-cols-2 gap-3">
        {coins.map((coin) => (
          <CryptoCard key={coin.symbol} coin={coin} />
        ))}
      </div>

      {/* Fear & Greed Index card */}
      <FearGreedCard data={fearGreed} />

      <p className="mt-1 text-[0.65rem] text-slate-400">
        Prices via Binance. Data is indicative and may be delayed.
      </p>
    </section>
  );
}

/* ---------- Individual coin card ---------- */

function CryptoCard({ coin }) {
  const { name, ticker, price, change24h, isUp, history } = coin;

  const formattedPrice =
    price != null
      ? `$${price.toLocaleString("en-US", {
          maximumFractionDigits: price > 100 ? 2 : 4,
        })}`
      : "--";

  const changeLabel =
    change24h != null
      ? `${isUp ? "+" : ""}${change24h.toFixed(2)}%`
      : "—";

  const changeClass =
    change24h == null
      ? "text-slate-400"
      : isUp
      ? "text-emerald-600"
      : "text-red-600";

  const chipBg =
    change24h == null
      ? "bg-slate-100 text-slate-500"
      : isUp
      ? "bg-emerald-50 text-emerald-700"
      : "bg-red-50 text-red-700";

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      {/* Top: icon + names */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[0.6rem] font-semibold tracking-wide text-white">
          {ticker}
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-slate-600">
            {name}
          </div>
          <div className="text-[0.6rem] uppercase tracking-[0.16em] text-slate-400">
            {ticker} / USDT
          </div>
        </div>
      </div>

      {/* Middle: price + change */}
      <div className="mt-2 flex flex-col gap-1">
        <div className="truncate text-right text-[0.9rem] font-semibold leading-tight text-slate-900">
          {formattedPrice}
        </div>
        <div className="flex justify-end">
          <span
            className={`inline-flex items-center rounded-full px-2 py-[1px] text-[0.65rem] font-medium ${chipBg}`}
          >
            <span
              className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                change24h == null
                  ? "bg-slate-300"
                  : isUp
                  ? "bg-emerald-500"
                  : "bg-red-500"
              }`}
            />
            <span className={changeClass}>{changeLabel}</span>
          </span>
        </div>
      </div>

      {/* Bottom: small sparkline */}
      <div className="mt-2">
        <Sparkline points={history} isUp={isUp} />
      </div>
    </div>
  );
}

/* ---------- Tiny line chart (sparkline) ---------- */

function Sparkline({ points, isUp }) {
  const width = 120;
  const height = 32;
  const padding = 4;

  if (!points || points.length < 2) {
    return (
      <div className="h-8 w-full rounded-md bg-slate-50">
        <div className="h-full w-full animate-pulse rounded-md bg-slate-100" />
      </div>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (points.length - 1);

  const svgPoints = points
    .map((value, index) => {
      const x = padding + index * stepX;
      const y =
        height -
        padding -
        ((value - min) / range) * (height - padding * 2);

      return `${x},${y}`;
    })
    .join(" ");

  const strokeColor = isUp ? "#16a34a" : "#dc2626"; // green-600 / red-600

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={isUp ? "spark-up-fill" : "spark-down-fill"}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor={isUp ? "#bbf7d0" : "#fecaca"}
            stopOpacity="0.6"
          />
          <stop
            offset="100%"
            stopColor={isUp ? "#bbf7d0" : "#fecaca"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      {/* Filled area under the line */}
      <polygon
        fill={`url(#${isUp ? "spark-up-fill" : "spark-down-fill"})`}
        points={`${svgPoints} ${width - padding},${height - padding} ${
          padding
        },${height - padding}`}
      />

      {/* Line */}
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={svgPoints}
      />
    </svg>
  );
}

/* ---------- Fear & Greed Card ---------- */

function FearGreedCard({ data }) {
  const value =
    data?.value != null && Number.isFinite(data.value) ? data.value : null;
  const label = data?.classification || "";

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-700">
          Crypto Fear &amp; Greed Index
        </h3>
        <span className="text-[0.6rem] uppercase tracking-[0.16em] text-slate-400">
          Sentiment
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <FearGreedGauge value={value} />

        <div className="text-center">
          <div className="text-xs font-semibold text-slate-900">
            {value != null ? value : "--"}
          </div>
          <div className="text-[0.7rem] uppercase tracking-[0.16em] text-slate-500">
            {label || "Loading..."}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Semi-circle gauge (speedometer) ---------- */

function FearGreedGauge({ value }) {
  const width = 180;
  const height = 90;
  const cx = width / 2;
  const cy = height;
  const r = 70;

  const clamped = value == null ? 50 : Math.max(0, Math.min(100, value));
  const angle = -90 + (clamped / 100) * 180; // -90 to 90
  const rad = (angle * Math.PI) / 180;

  const needleX = cx + r * Math.cos(rad);
  const needleY = cy + r * Math.sin(rad);

  const arcPath = describeArc(cx, cy, r, -90, 90);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-24 w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fg-arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#dc2626" /> {/* red-600 */}
          <stop offset="50%" stopColor="#fbbf24" /> {/* amber-400 */}
          <stop offset="100%" stopColor="#16a34a" /> {/* green-600 */}
        </linearGradient>
      </defs>

      {/* Thick background arc */}
      <path
        d={arcPath}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="16"           /* thicker grey base */
        strokeLinecap="round"
      />

      {/* Thick colored arc */}
      <path
        d={arcPath}
        fill="none"
        stroke="url(#fg-arc-gradient)"
        strokeWidth="12"          /* thicker color band */
        strokeLinecap="round"
      />

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Needle hub */}
      <circle cx={cx} cy={cy} r="6" fill="#0f172a" />
      <circle cx={cx} cy={cy} r="3" fill="white" />
    </svg>
  );
}

/* Helper for SVG arc path (semi-circle) */
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const rad = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

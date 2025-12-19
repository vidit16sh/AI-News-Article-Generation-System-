// src/app/layout.js
import "./globals.css";
import Header from "../components/layout/Header.jsx";
import Footer from "../components/layout/Footer.jsx";
import ScrollToTop from "../components/utils/ScrollToTop.jsx";
import { Suspense } from "react";

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),

  title: {
    template: "%s | CoinMarketBuzz - Crypto News & Market Updates",
    default:
      "CoinMarketBuzz | Latest Cryptocurrency News, Bitcoin Prices & Ethereum Updates",
  },

  description:
    "Your daily source for breaking cryptocurrency news, live crypto prices, and market analysis. Get updates on Bitcoin, Ethereum, Shiba Inu, and DeFi trends.",

  keywords: [
    "Cryptocurrency news",
    "Bitcoin news",
    "Ethereum news",
    "Crypto market updates",
    "Crypto prices live",
    "Blockchain news",
  ],

  alternates: {
    types: {
      "application/rss+xml": [{ url: "/api/feed/rss.xml", title: "RSS Feed" }],
    },
  },

  // ✅ FAVICON CONFIG (App Router way)
  icons: {
    icon: "/brand/iconcircle.jpg",
    shortcut: "/brand/iconcircle.jpg",
    apple: "/brand/iconcircle.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="thin-scrollbar">
      <body className="flex min-h-screen flex-col text-slate-900">
        <Header />

        {/* ✅ Fix build error: useSearchParams() must be inside a Suspense boundary */}
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>

        <main className="flex-1">
          {/* Mobile: full width, larger screens: centered with max width */}
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>

        <Footer />
      </body>
    </html>
  );
}

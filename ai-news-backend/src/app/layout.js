import "./globals.css";
import Header from "../components/layout/Header.jsx";
import Footer from "../components/layout/Footer.jsx";
import ScrollToTop from "../components/utils/ScrollToTop.jsx";

export const metadata = { 
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    template: '%s | CoinMarketBuzz - Crypto News & Market Updates',
    default: 'CoinMarketBuzz | Latest Cryptocurrency News, Bitcoin Prices & Ethereum Updates',
  },
  description: "Your daily source for breaking cryptocurrency news, live crypto prices, and market analysis. Get updates on Bitcoin, Ethereum, Shiba Inu, and DeFi trends.",
  keywords: ["Cryptocurrency news", "Bitcoin news", "Ethereum news", "Crypto market updates", "Crypto prices live", "Blockchain news"],
  alternates: {
    types: {
      'application/rss+xml': [
        { url: '/api/feed/rss.xml', title: 'RSS Feed' },
      ],
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="thin-scrollbar">
      <body className="flex min-h-screen flex-col  text-slate-900">
        <Header />

        {/* ✅ Forces scroll-to-top on every route change */}
        <ScrollToTop />

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

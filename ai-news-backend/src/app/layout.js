import "./globals.css";
import Header from "../components/layout/Header.jsx";
import Footer from "../components/layout/Footer.jsx";

export const metadata = {
  title: "CoinMarketBuzz",
  description: "CoinMarketBuzz curates crypto, AI, and tech news from top sources and expands them into AI-generated explainers for fast, informed reading.",
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

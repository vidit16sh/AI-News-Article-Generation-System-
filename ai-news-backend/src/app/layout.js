import './globals.css';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import ScrollToTop from '../components/utils/ScrollToTop.jsx';
import { Suspense } from 'react';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    template: '%s',
    default: 'CoinMarketBuzz | Latest Cryptocurrency News, Bitcoin Prices & Ethereum Updates',
  },
  description:
    'Your daily source for breaking cryptocurrency news, live crypto prices, and market analysis. Get updates on Bitcoin, Ethereum, Shiba Inu, and DeFi trends.',
  verification: {
    google: 'tnNTMQdn3oiUw-fpj-4ouecVjcPCC6duljA8R_bB7Sg',
  },
  keywords: [
    'Cryptocurrency news',
    'Bitcoin news',
    'Ethereum news',
    'Crypto market updates',
    'Crypto prices live',
    'Blockchain news',
  ],
  alternates: {
    types: {
      'application/rss+xml': [{ url: '/rss.xml', title: 'RSS Feed' }],
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/brand/logocircle.png',
    shortcut: '/brand/logocircle.png',
    apple: '/brand/logocircle.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="thin-scrollbar">
      <body className="flex min-h-screen flex-col text-slate-900">
        <Header />
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  );
}

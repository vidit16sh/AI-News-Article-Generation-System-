import "./globals.css";
import Header from "../components/layout/Header.jsx";
import Footer from "../components/layout/Footer.jsx";

export const metadata = {
  title: "VrajNews | AI-Powered Crypto & Tech News",
  description:
    "VrajNews curates crypto, AI, and tech news from top sources and expands them into AI-generated explainers for fast, informed reading.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="thin-scrollbar">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <Header />
        <main className="flex-1">
          {/* Main content: ~90% of header/footer width (≈ 81% of viewport) */}
          <div className="mx-auto w-[81vw] max-w-[1280px] py-6 sm:px-2 sm:py-8">
            {children}
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t-4 border-[#d00000] bg-[#050816] text-slate-100">
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-10 md:grid-cols-[2.1fr_3fr]">
          
          {/* 1. Brand & Physical Contact Info (CRITICAL for Google News) */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Link href="/" className="inline-flex items-center gap-2">
                <Image 
                  src="/logo.png" 
                  alt="Coin Market Buzz" 
                  width={140} 
                  height={36} 
                  className="h-[34px] w-auto object-contain" 
                />
              </Link>
            </div>
            <p className="max-w-md text-[0.9rem] leading-relaxed text-slate-300">
              Stay updated on the latest happenings in the Crypto Market. Whether it's business, politics, tech or finance, we deliver it in a flash—straight to your inbox.
            </p>

            {/* 🚨 TRANSPARENCY BOX: Replace with your REAL details */}
            <div className="mt-8 rounded-lg bg-slate-900/50 p-5 border border-slate-800">
                <h4 className="text-sm font-semibold text-white mb-3">Contact the Newsroom</h4>
                <address className="text-[0.8rem] text-slate-400 space-y-1.5 not-italic">
                    <p><strong className="text-slate-300">CoinMarketBuzz HQ</strong></p>
                    <p>123 Innovation Drive, Suite 100</p>
                    <p>New York, NY 10001, USA</p>
                    <p className="mt-2 flex items-center gap-2">
                      <span className="text-slate-500">Phone:</span> 
                      <span>+1 (555) 012-3456</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-slate-500">Email:</span> 
                      <a href="mailto:editor@coinmarketbuzz.com" className="text-blue-400 hover:text-blue-300 transition-colors">editor@coinmarketbuzz.com</a>
                    </p>
                </address>
            </div>
          </div>

          {/* 2. Navigation Columns */}
          <div className="space-y-8 lg:space-y-0 lg:flex lg:items-start lg:justify-between">
            
            <FooterColumn title="Company">
              <FooterLink href="/about">About Us</FooterLink>
              <FooterLink href="/authors">Editorial Team</FooterLink>
              <FooterLink href="/contact">Contact & Tips</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
            </FooterColumn>

            <FooterColumn title="Categories" className="lg:pl-8">
              <FooterLink href="/category/crypto">Crypto News</FooterLink>
              <FooterLink href="/category/finance">Market Analysis</FooterLink>
              <FooterLink href="/category/tech">Technology</FooterLink>
              <FooterLink href="/category/ai">AI & Web3</FooterLink>
              <FooterLink href="/category/business">Business</FooterLink>
            </FooterColumn>

            <FooterColumn title="Social Media" className="lg:pl-8">
              <FooterSocial label="Twitter" Icon={Twitter} href="#" />
              <FooterSocial label="Facebook" Icon={Facebook} href="#" />
              <FooterSocial label="LinkedIn" Icon={Linkedin} href="#" />
              <FooterSocial label="Instagram" Icon={Instagram} href="#" />
              <FooterSocial label="YouTube" Icon={Youtube} href="#" />
            </FooterColumn>
          </div>
        </div>
        
        {/* 3. Bottom Copyright & Sitemaps */}
        <div className="mt-12 border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
            <p>&copy; {currentYear} CoinMarketBuzz. All rights reserved.</p>
            <div className="mt-4 md:mt-0 flex gap-6">
                <Link href="/sitemap.xml" className="hover:text-slate-300 transition-colors">Sitemap</Link>
                <Link href="/rss.xml" className="hover:text-slate-300 transition-colors">RSS Feed</Link>
            </div>
        </div>
      </div>
    </footer>
  );
}

// --- Subcomponents ---

function FooterColumn({ title, children, className = "" }) {
  return (
    <div className={className}>
      <div className="mb-4 flex items-center gap-2">
        <span className="h-[16px] w-[4px] rounded-[2px] bg-red-600" />
        <h3 className="text-[0.95rem] font-medium text-slate-100 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-2 text-[0.9rem] text-slate-300">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }) {
  return (
    <Link href={href} className="block text-slate-400 hover:text-white hover:translate-x-1 transition-all duration-200">
      {children}
    </Link>
  );
}

function FooterSocial({ label, Icon, href }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 text-[0.9rem] text-slate-400 hover:text-white transition-colors group py-1"
      aria-label={label}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-[#050b1f] group-hover:border-red-600 group-hover:bg-red-600 transition-all duration-300">
        <Icon className="h-4 w-4 text-slate-300 group-hover:text-white" />
      </span>
      <span>{label}</span>
    </Link>
  );
}
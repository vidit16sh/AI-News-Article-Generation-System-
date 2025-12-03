// src/components/layout/Footer.jsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-10 border-t-4 border-[#d00000] bg-[#050816] text-slate-100">
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-12">
        {/* Main layout: left subscribe, right link groups */}
        <div className="grid gap-10 lg:grid-cols-[2.1fr_3fr]">
          {/* Subscribe block */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="h-[16px] w-[6px] rounded-[2px] bg-red-500" />
              <h2 className="text-[1rem] sm:text-[1.1rem] font-light">
                Subscribe to Coin Market Buzz
              </h2>
            </div>

            <p className="max-w-md text-[0.9rem] leading-relaxed text-slate-300">
              Stay updated on the latest happenings in the Crypto Market Whether it&apos;s
              business, politics, tech or finance, we deliver it in a
              flash—straight to your inbox.
            </p>

            {/* Email "form" UI only – no event handlers */}
            <div className="mt-5 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="youremail@gmail.com"
                className="h-11 flex-1 rounded-md border border-slate-600 bg-[#050b1f] px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-red-500"
              />
              <button
                type="button"
                className="h-11 rounded-md bg-[#d00000] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#e00000]"
              >
                Subscribe
              </button>
            </div>

            <p className="mt-3 max-w-md text-[0.7rem] leading-relaxed text-slate-400">
              We don&apos;t spam, promised. Only two emails every month, you can
              opt out anytime with just one click.
            </p>
          </div>

          {/* Link groups: Company / Categories / Social */}
          <div className="space-y-8 lg:space-y-0 lg:flex lg:items-start lg:justify-between lg:divide-x lg:divide-slate-800">
            {/* Company */}
            <FooterColumn title="Company">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/careers">Careers</FooterLink>
              <FooterLink href="/authors">Authors</FooterLink>
              <FooterLink href="/advertise">Advertise</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
            </FooterColumn>

            {/* Categories */}
            <FooterColumn title="Categories" className="lg:pl-8">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[0.85rem]">
                <FooterLink href="/category/business">Business</FooterLink>
                <FooterLink href="/category/finance">Finance</FooterLink>
                <FooterLink href="/category/health">Health</FooterLink>
                <FooterLink href="/category/politics">Politics</FooterLink>
                <FooterLink href="/category/fashion">Fashion</FooterLink>
                <FooterLink href="/category/real-estate">Real Estate</FooterLink>
                <FooterLink href="/category/travel">Travel</FooterLink>
                <FooterLink href="/category/entertainment">Entertainment</FooterLink>
                <FooterLink href="/category/sports">Sports</FooterLink>
                <FooterLink href="/category/tech">Tech</FooterLink>
              </div>
            </FooterColumn>

            {/* Social media */}
            <FooterColumn title="Social Media" className="lg:pl-8">
              <FooterSocial label="Facebook" />
              <FooterSocial label="Instagram" />
              <FooterSocial label="Twitter" />
              <FooterSocial label="LinkedIn" />
              <FooterSocial label="YouTube" />
            </FooterColumn>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Small subcomponents ---------- */

function FooterColumn({ title, className = "", children }) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-[16px] w-[6px] rounded-[2px] bg-red-500" />
        <h3 className="text-[0.95rem] font-light text-slate-100">{title}</h3>
      </div>
      <div className="space-y-1 text-[0.85rem] text-slate-300">
        {children}
      </div>
    </div>
  );
}

function FooterLink({ href, children }) {
  return (
    <Link
      href={href}
      className="block text-[0.85rem] text-slate-300 hover:text-white"
    >
      {children}
    </Link>
  );
}

function FooterSocial({ label }) {
  return (
    <div className="flex items-center gap-2 text-[0.85rem] text-slate-300 hover:text-white">
      <span className="h-4 w-4 rounded-full border border-slate-500 flex items-center justify-center text-[0.55rem]">
        ●
      </span>
      <span>{label}</span>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Twitter, Linkedin, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-10 border-t-4 border-[#d00000] bg-[#050816] text-slate-100">
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-12">
        {/* Main layout: left brand, right link groups */}
        <div className="grid gap-10 md:grid-cols-[2.1fr_3fr]">
          {/* Brand block */}
          <div>
            {/* Logo instead of heading */}
            <div className="mb-4 flex items-center gap-3">
              <Link href="/" className="inline-flex items-center gap-2">
                {/* Update src to your actual logo path */}
                <Image
                  src="/logo.png"
                  alt="Coin Market Buzz"
                  width={140}
                  height={36}
                  className="h-[34px] w-auto object-contain"
                  priority={false}
                />
              </Link>
            </div>

            <p className="max-w-md text-[0.9rem] leading-relaxed text-slate-300">
              Stay updated on the latest happenings in the Crypto Market Whether
              it&apos;s business, politics, tech or finance, we deliver it in a
              flash—straight to your inbox.
            </p>
          </div>

          {/* Link groups: Company / Categories / Social */}
          <div className="space-y-8 lg:space-y-0 lg:flex lg:items-start lg:justify-between">
            {/* Company */}
            <FooterColumn title="Company">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/authors">Authors</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
            </FooterColumn>

            {/* Categories - ONE column now */}
            <FooterColumn title="Categories" className="lg:pl-8">
              <FooterLink href="/category/business">Business</FooterLink>
              <FooterLink href="/category/finance">Finance</FooterLink>
              <FooterLink href="/category/sports">Sports</FooterLink>
              <FooterLink href="/category/tech">Tech</FooterLink>
              <FooterLink href="/category/politics">Politics</FooterLink>
              <FooterLink href="/category/crypto">Crypto</FooterLink>
              <FooterLink href="/category/ai">AI</FooterLink>
              <FooterLink href="/category/world">World</FooterLink>
            </FooterColumn>

            {/* Social media with icons */}
            <FooterColumn title="Social Media" className="lg:pl-8">
              <FooterSocial label="Facebook" Icon={Facebook} href="#" />
              <FooterSocial label="Instagram" Icon={Instagram} href="#" />
              <FooterSocial label="Twitter" Icon={Twitter} href="#" />
              <FooterSocial label="LinkedIn" Icon={Linkedin} href="#" />
              <FooterSocial label="YouTube" Icon={Youtube} href="#" />
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
      <div className="space-y-1 text-[0.85rem] text-slate-300">{children}</div>
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

function FooterSocial({ label, Icon, href }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 text-[0.85rem] text-slate-300 hover:text-white"
      aria-label={label}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-[#050b1f]">
        <Icon className="h-4 w-4" />
      </span>
      <span>{label}</span>
    </Link>
  );
}

// src/components/layout/Header.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const PRIMARY_LINKS = [
  { label: "Latest News", href: "/" },
  { label: "Crypto News", href: "/category/crypto" },
  { label: "Bitcoin", href: "/category/bitcoin" },
  { label: "Ethereum", href: "/category/ethereum" },
  { label: "Finance News", href: "/category/finance" },
  { label: "Forex News", href: "/category/defi" },
  { label: "Regulation", href: "/category/regulation" },
];

const SECONDARY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Careers", href: "/careers" }, 
  { label: "News Archive", href: "/archive" },
  { label: "Authors", href: "/authors" },
  { label: "Advertise", href: "/advertise" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dateString, setDateString] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        month: "long",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      };
      setDateString(now.toLocaleDateString("en-US", options).replace(",", " -"));
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleMenu = () => setIsMenuOpen((open) => !open);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* ================= DESKTOP HEADER ================= */}
      <div className="hidden flex-col lg:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <div className="flex-1 text-[11px] font-normal text-slate-500">
            {dateString || "Loading..."}
          </div>

          <div className="flex flex-none justify-center">
            <LogoDesktop />
          </div>

          {/* ✅ Desktop Search (Objective 1) */}
          <div className="flex flex-1 items-center justify-end">
            <form action="/search" method="GET" className="w-full max-w-[260px]">
              <label className="sr-only" htmlFor="header-search">
                Search
              </label>

              <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm focus-within:border-slate-300">
                <input
                  id="header-search"
                  name="q"
                  type="search"
                  placeholder="Search..."
                  className="h-9 w-full bg-transparent px-3 text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="inline-flex h-9 w-10 items-center justify-center text-slate-500 hover:text-slate-800"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M16.5 16.5 21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="flex h-11 items-center justify-center border-b border-red-700 bg-[#d00000] text-[13px] font-medium tracking-[0.06em] text-white">
          <div className="flex w-full max-w-5xl items-center justify-between px-4">
            <nav className="flex flex-1 items-center justify-center gap-6">
              {PRIMARY_LINKS.map((item, index) => (
                <div key={item.href} className="flex items-center">
                  <NavLink href={item.href}>{item.label}</NavLink>
                  {index === 0 && (
                    <span className="ml-4 h-4 border-l border-white/60" />
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50" />
      </div>

      {/* ================= MOBILE / TABLET HEADER ================= */}
      <div className="flex items-center justify-between bg-[#d00000] px-4 py-3 text-white lg:hidden">
        <LogoMobile />

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          onClick={toggleMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#d00000] shadow-sm"
        >
          <div className="relative h-3 w-4">
            <span
              className={`absolute left-0 right-0 h-[2px] rounded-full bg-current transition-transform duration-200 ${
                isMenuOpen ? "translate-y-[5px] rotate-45" : "translate-y-0"
              }`}
            />
            <span
              className={`absolute left-0 right-0 h-[2px] rounded-full bg-current transition-opacity duration-150 ${
                isMenuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 right-0 h-[2px] rounded-full bg-current transition-transform duration-200 ${
                isMenuOpen
                  ? "-translate-y-[5px] -rotate-45"
                  : "translate-y-[10px]"
              }`}
            />
          </div>
        </button>
      </div>

      {/* ================= MOBILE MENU OVERLAY ================= */}
      <div
        className={`fixed inset-0 z-40 transform bg-white transition-transform duration-300 ease-out lg:hidden ${
          isMenuOpen ? "translate-y-0" : "-translate-y-full pointer-events-none"
        }`}
      >
        <div className="pt-3" />

        <div className="flex items-center justify-between px-4 pb-3">
          <LogoMobile dark />

          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#d00000] text-white shadow-sm"
          >
            <span className="relative block h-3 w-3">
              <span className="absolute inset-0 h-[2px] w-full rotate-45 rounded-full bg-current" />
              <span className="absolute inset-0 h-[2px] w-full -rotate-45 rounded-full bg-current" />
            </span>
          </button>
        </div>

        <div className="px-4 pb-10 pt-4">
          {/* ✅ Mobile Overlay Search (Objective 1) */}
          <form action="/search" method="GET" onSubmit={closeMenu} className="mb-6">
            <label className="sr-only" htmlFor="mobile-search">
              Search
            </label>

            <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-slate-300">
              <span className="inline-flex h-11 w-11 items-center justify-center text-slate-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M16.5 16.5 21 21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <input
                id="mobile-search"
                name="q"
                type="search"
                placeholder="Search CoinMarketBuzz..."
                className="h-11 w-full bg-transparent pr-3 text-[14px] text-slate-800 outline-none placeholder:text-slate-400"
              />

              <button
                type="submit"
                className="mr-2 inline-flex h-9 items-center justify-center rounded-lg bg-[#d00000] px-3 text-xs font-semibold text-white"
              >
                Search
              </button>
            </div>
          </form>

          <nav>
            <ul className="space-y-3 text-[15px] font-medium text-slate-900">
              {PRIMARY_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={closeMenu}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-6 border-t border-slate-200" />

          <nav className="mt-4 space-y-3 text-[14px] text-slate-700">
            {SECONDARY_LINKS.map((item) => (
              <Link key={item.href} href={item.href} onClick={closeMenu}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

/* ================= LOGO COMPONENTS ================= */

function LogoDesktop() {
  return (
    <Link href="/" className="flex items-center">
      <Image src="/brand/logo.png" alt="CoinMarketBuzz" width={200} height={40} priority />
    </Link>
  );
}

function LogoMobile({ dark = false }) {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/brand/logo.png"
        alt="CoinMarketBuzz"
        width={140}
        height={32}
        priority
        className={dark ? "" : "brightness-0 invert"}
      />
    </Link>
  );
}

function NavLink({ href, children }) {
  return (
    <Link
      href={href}
      className="relative text-[13px] font-medium tracking-[0.03em] text-white/90 transition hover:text-white"
    >
      {children}
    </Link>
  );
}

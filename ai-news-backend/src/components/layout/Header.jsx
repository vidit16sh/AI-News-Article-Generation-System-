"use client";

import { useState } from "react";
import Link from "next/link";

const PRIMARY_LINKS = [
  { label: "Latest News", href: "/" },
  { label: "Business", href: "/category/business" },
  { label: "Finance", href: "/category/finance" },
  { label: "Health", href: "/category/health" },
  { label: "Politics", href: "/category/politics" },
  { label: "Fashion", href: "/category/fashion" },
  { label: "Real Estate", href: "/category/real-estate" },
  { label: "Travel", href: "/category/travel" },
  { label: "Entertainment", href: "/category/entertainment" },
  { label: "Sports", href: "/category/sports" },
  { label: "Tech", href: "/category/tech" },
  { label: "Podcast", href: "/podcast" },
];

const SECONDARY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Authors", href: "/authors" },
  { label: "Advertise", href: "/advertise" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((open) => !open);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-white ">
      {/* DESKTOP HEADER (date + logo + location in one line) */}
      {/* Now only on lg and up */}
      <div className="hidden flex-col lg:flex">
        {/* Top row */}
        <div className="flex h-16 items-center border-b border-slate-200 px-6 ">
          <div className="flex-1 text-[11px] font-normal text-slate-500">
            December 01 - 03:51 AM
          </div>

          <div className="flex flex-none justify-center">
            <LogoDesktop />
          </div>

          <div className="flex-1 text-right text-[11px] font-normal text-slate-500">
            New York, US: 3.3°C
          </div>
        </div>

        {/* Red nav bar under logo */}
        <div className="flex h-11 items-center justify-center border-b border-red-700 bg-[#d00000] text-[13px] font-medium tracking-[0.06em] text-white">
          <div className="flex w-full max-w-5xl items-center justify-between px-4">
            {/* Nav links */}
            <nav className="flex flex-1 items-center justify-center gap-6">
              {PRIMARY_LINKS.map((item, index) => (
                <div key={item.href} className="flex items-center">
                  <NavLink href={item.href}>{item.label}</NavLink>

                  {/* Thin divider after "Latest News" */}
                  {index === 0 && (
                    <span className="ml-4 h-4 border-l border-white/60" />
                  )}
                </div>
              ))}
            </nav>

            {/* Search circle on right */}
            <button
              type="button"
              aria-label="Search"
              className="ml-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-transparent text-white/90 transition hover:bg-white hover:text-[#d00000]"
            >
              <SearchIcon />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE/TABLET HEADER (red bar) */}
      {/* Now used for < lg (so phones + tablets) */}
      <div className="flex items-center justify-between bg-[#d00000] px-4 py-3 text-white lg:hidden">
        <LogoMobile />

        <div className="flex items-center gap-3">
          {/* Search circle */}
          <button
            type="button"
            aria-label="Search"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-transparent text-white/95"
          >
            <SearchIcon />
          </button>

          {/* Hamburger / menu icon */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            onClick={toggleMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#d00000] shadow-sm"
          >
            {/* Equal / close icon */}
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
      </div>

      {/* MOBILE/TABLET FULLSCREEN MENU OVERLAY */}
      <div
        className={`fixed inset-0 z-40 transform bg-white transition-transform duration-300 ease-out lg:hidden ${
          isMenuOpen ? "translate-y-0" : "-translate-y-full pointer-events-none"
        }`}
      >
        {/* top strip so it sits below browser status bar */}
        <div className="pt-3" />

        {/* Top row with logo, search and close buttons */}
        <div className="flex items-center justify-between px-4 pb-3">
          <LogoMobile color="black" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Search"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
            >
              <SearchIcon />
            </button>

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
        </div>

        {/* Menu items with slide/fade animation */}
        <div className="px-4 pb-10 pt-4">
          <nav aria-label="Mobile primary navigation">
            <ul className="space-y-3 text-[15px] font-medium text-slate-900">
              {PRIMARY_LINKS.map((item, index) => (
                <li
                  key={item.href}
                  className={`transform transition-all duration-300 ${
                    isMenuOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-4 opacity-0"
                  } ${index === 0 ? "delay-75" : `delay-${75 + index * 25}`}`}
                >
                  <Link href={item.href} onClick={closeMenu} className="block">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Divider */}
          <div className="mt-6 border-t border-slate-200" />

          {/* Secondary links at bottom section */}
          <nav
            aria-label="Mobile secondary navigation"
            className="mt-4 space-y-3 text-[14px] text-slate-700"
          >
            {SECONDARY_LINKS.map((item, index) => (
              <div
                key={item.href}
                className={`transform transition-all duration-300 ${
                  isMenuOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0"
                } ${`delay-${200 + index * 25}`}`}
              >
                <Link href={item.href} onClick={closeMenu} className="block">
                  {item.label}
                </Link>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

/* --------- SMALL COMPONENTS ---------- */

function LogoDesktop() {
  return (
    <Link href="/" className="flex items-baseline gap-1">
      <span className="text-3xl font-semibold tracking-tight text-black">
        CoinMarket
      </span>
      <span className="text-3xl font-semibold tracking-tight text-[#e00000]">
        Buzz
      </span>
    </Link>
  );
}

function LogoMobile({ color = "white" }) {
  const textColorMain =
    color === "white" ? "text-white/80" : "text-slate-900";
  const textColorFlash =
    color === "white" ? "text-white" : "text-[#e00000]";

  return (
    <Link href="/" className="flex items-baseline gap-1">
      <span className={`text-2xl font-semibold tracking-tight ${textColorMain}`}>
        news
      </span>
      <span
        className={`text-2xl font-semibold tracking-tight ${textColorFlash}`}
      >
        flash
      </span>
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

function SearchIcon({ size = 16, className = "" }) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle
        cx="9"
        cy="9"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <line
        x1="12.5"
        y1="12.5"
        x2="17"
        y2="17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

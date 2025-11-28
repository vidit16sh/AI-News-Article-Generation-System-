"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((open) => !open);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      {/* Header content: 90% of viewport, capped at 1440px */}
      <div className="mx-auto flex h-14 w-[90vw] max-w-[1440px] items-center justify-between gap-3 px-2 sm:h-16 sm:px-4">
        {/* Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-2"
          onClick={closeMenu}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 to-red-500 shadow-sm" />
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-[0.12em] uppercase text-slate-900">
              VrajNews
            </span>
            <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
              AI Edition
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex"
          aria-label="Main navigation"
        >
          <NavLink href="/">Home</NavLink>
          <NavLink href="/category/crypto">Crypto</NavLink>
          <NavLink href="/category/ai-news">AI News</NavLink>
          <NavLink href="/category/world-news">World</NavLink>
          <NavLink href="/search">Search</NavLink>
        </nav>

        {/* Right section: search + hamburger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
            aria-label="Search articles"
          >
            <SearchIcon />
          </button>

          {/* Hamburger (mobile only) */}
          <button
            type="button"
            className="inline-flex flex-col items-center justify-center gap-[4px] rounded-full p-1.5 text-slate-800 transition hover:bg-slate-100 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            onClick={toggleMenu}
          >
            <span
              className={`h-[2px] w-5 rounded-full bg-slate-900 transition-transform duration-200 ${
                isMenuOpen ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`h-[2px] w-5 rounded-full bg-slate-900 transition-opacity duration-150 ${
                isMenuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`h-[2px] w-5 rounded-full bg-slate-900 transition-transform duration-200 ${
                isMenuOpen ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay (spans full width, but aligned with header height) */}
      <div
        className={`fixed inset-x-0 top-[3.5rem] origin-top transform bg-slate-900/85 text-slate-50 backdrop-blur-xl transition-all duration-200 md:hidden ${
          isMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 pb-6 pt-4 thin-scrollbar">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1 text-[0.75rem]">
            <span>⚡</span>
            <span className="text-slate-200">
              AI-generated crypto &amp; tech stories
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900 px-3 py-2">
            <SearchIcon size={16} className="text-slate-300" />
            <input
              type="text"
              placeholder="Search articles…"
              aria-label="Search articles"
              className="w-full border-none bg-transparent text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <nav
            className="flex flex-col gap-2 pt-1 text-sm font-medium"
            aria-label="Mobile navigation"
          >
            <MobileNavLink href="/" onClick={closeMenu}>
              Home
            </MobileNavLink>
            <MobileNavLink href="/category/crypto" onClick={closeMenu}>
              Crypto
            </MobileNavLink>
            <MobileNavLink href="/category/ai-news" onClick={closeMenu}>
              AI News
            </MobileNavLink>
            <MobileNavLink href="/category/world-news" onClick={closeMenu}>
              World News
            </MobileNavLink>
            <MobileNavLink href="/category/technology" onClick={closeMenu}>
              Technology
            </MobileNavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }) {
  return (
    <Link
      href={href}
      className="relative text-slate-600 transition hover:text-slate-900"
    >
      <span>{children}</span>
    </Link>
  );
}

function MobileNavLink({ href, children, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-lg px-2 py-2 text-slate-50 transition hover:bg-slate-800/80"
    >
      {children}
    </Link>
  );
}

function SearchIcon({ size = 18, className = "" }) {
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

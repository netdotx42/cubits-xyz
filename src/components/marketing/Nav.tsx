"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "./Button";

const links = [
  { href: "/cubits", label: "Cubits" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-h-[44px] items-center gap-2 text-base font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <span aria-hidden className="text-[10px]">◼</span>
          Cubits
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex min-h-[44px] items-center px-4 text-sm text-mute transition-colors duration-200 hover:text-paper">
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="flex min-h-[44px] items-center px-4 text-sm text-mute transition-colors duration-200 hover:text-paper">
            Log in
          </Link>
          <Button href="/signup" className="ml-2 !min-h-[36px] !px-4">Start free trial</Button>
        </nav>
        <button
          type="button"
          className="flex min-h-[44px] min-w-[44px] items-center justify-end font-mono text-xs uppercase tracking-widest md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <div
        id="mobile-menu"
        className={`${open ? "block" : "hidden"} border-t border-line bg-black md:hidden`}
      >
        <div className="mx-auto flex max-w-6xl flex-col px-4 py-2">
          {[...links, { href: "/login", label: "Log in" }].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[52px] items-center border-b border-line text-lg tracking-tight"
            >
              {l.label}
            </Link>
          ))}
          <div className="py-4">
            <Button href="/signup" className="w-full">Start 7-day free trial</Button>
          </div>
        </div>
      </div>
    </header>
  );
}

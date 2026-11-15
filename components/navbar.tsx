"use client";

import { useState } from "react";
import NextLink from "next/link";
import clsx from "clsx";

import { siteConfig } from "@/config/site";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-emerald-950/40 bg-[#050a08]">
      <header className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-4">
          <NextLink className="flex items-center gap-2 group" href="/">
            <p className="font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              Crop Catcher
            </p>
          </NextLink>
          <ul className="hidden lg:flex gap-4 ml-4">
            {siteConfig.navItems.map((item) => (
              <li key={item.href}>
                <NextLink
                  className={clsx(
                    "text-zinc-400 hover:text-emerald-400 text-sm font-medium transition-colors",
                    "data-[active=true]:text-emerald-400 data-[active=true]:font-medium",
                  )}
                  href={item.href}
                >
                  {item.label}
                </NextLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex sm:hidden items-center gap-2">
          <button
            aria-expanded={isMenuOpen}
            aria-label="Toggle menu"
            className="p-2 text-zinc-400 hover:text-emerald-400"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              ) : (
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              )}
            </svg>
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div className="border-t border-separator sm:hidden">
          <ul className="flex flex-col gap-2 px-4 pb-4" />
        </div>
      )}
    </nav>
  );
};

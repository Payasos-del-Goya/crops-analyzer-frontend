"use client";

import { useState } from "react";
import NextLink from "next/link";

import { logout, Session } from "@/lib/api";

export const Navbar = ({ session }: { session: Session | null }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.assign("/login");
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-emerald-950/40 bg-[#050a08]">
      <header className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-4">
          <NextLink className="flex items-center gap-2 group" href="/">
            <p className="font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              Crop Catcher
            </p>
          </NextLink>
        </div>

        {session && (
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <span className="text-zinc-300">
              {session.nombre ?? session.cliente_id}
            </span>
            <span className="text-zinc-500">{session.usuario}</span>
            <button
              className="px-2.5 py-1 rounded-md border border-emerald-900/60 text-zinc-300 hover:text-emerald-400 hover:border-emerald-700"
              type="button"
              onClick={handleLogout}
            >
              Salir
            </button>
          </div>
        )}

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
          <ul className="flex flex-col gap-2 px-4 py-3 text-sm">
            {session && (
              <li className="flex items-center justify-between gap-3">
                <span className="text-zinc-300">
                  {session.nombre ?? session.cliente_id} · {session.usuario}
                </span>
                <button
                  className="text-zinc-400 hover:text-emerald-400"
                  type="button"
                  onClick={handleLogout}
                >
                  Salir
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </nav>
  );
};

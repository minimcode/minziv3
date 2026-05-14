"use client";

import Link from "next/link";
import Image from "next/image";

const NAV: { href: string; label: string }[] = [
  { href: "#features", label: "Возможности" },
  { href: "#how", label: "Как это работает" },
  { href: "#testimonials", label: "Отзывы" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-lg bg-[var(--background)]/70 border-b border-[var(--border)]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 mr-2">
          <Image src="/icon.svg" alt="" width={32} height={32} />
          <div className="leading-tight">
            <div className="text-lg font-display font-semibold tracking-tight">
              Minzi
            </div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-[var(--foreground-muted)] flex-1 min-w-0">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="whitespace-nowrap hover:text-[var(--foreground)] transition-colors duration-200"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <Link
            href="/login"
            className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors hidden sm:block"
          >
            Войти
          </Link>
          <Link
            href="/learn"
            className="btn btn-primary h-10 text-sm whitespace-nowrap"
          >
            Начать бесплатно
          </Link>
        </div>
      </div>
    </header>
  );
}

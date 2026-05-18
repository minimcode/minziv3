"use client";

import Link from "next/link";

const NAV: { href: string; label: string }[] = [
  { href: "#features", label: "Возможности" },
  { href: "#how", label: "Как это работает" },
  { href: "#testimonials", label: "Отзывы" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--background)]/85 border-b border-[var(--border)]/50">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span
            aria-hidden
            className="h-9 w-9 rounded-[9px] bg-[var(--red)] text-white font-hanzi text-[20px] leading-none flex items-center justify-center shadow-[0_2px_6px_-2px_rgba(196,58,58,0.5)]"
          >
            字
          </span>
          <span className="text-[19px] font-display font-semibold tracking-tight text-[var(--foreground)]">
            Minzi
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[14px] text-[var(--foreground-muted)] flex-1 min-w-0">
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
        <div className="ml-auto flex items-center gap-5 shrink-0">
          <Link
            href="/login"
            className="text-[14px] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors hidden sm:block"
          >
            Войти
          </Link>
          <Link
            href="/learn"
            className="btn btn-primary h-10 px-5 text-[14px] whitespace-nowrap"
          >
            Начать бесплатно
          </Link>
        </div>
      </div>
    </header>
  );
}

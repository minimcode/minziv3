import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start text-sm text-[var(--foreground-muted)]">
        <div>
          <Link href="/" className="flex items-center gap-2.5 mb-4">
            <Image src="/icon.svg" alt="" width={28} height={28} />
            <span className="text-base font-display font-semibold tracking-tight text-[var(--foreground)]">
              Minzi
            </span>
          </Link>
          <p className="max-w-sm leading-relaxed">
            Учите китайские иероглифы через письмо и понимание.
          </p>
          <p className="mt-3 text-xs text-[var(--foreground-soft)]">
            Данные: HSK 3.0, Hanzi Writer, MakeMeAHanzi, CC-CEDICT.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          <Link
            href="#"
            className="hover:text-[var(--foreground)] transition-colors"
          >
            Политика конфиденциальности
          </Link>
          <Link
            href="#"
            className="hover:text-[var(--foreground)] transition-colors"
          >
            Условия использования
          </Link>
          <Link
            href="#"
            className="hover:text-[var(--foreground)] transition-colors"
          >
            Связаться с нами
          </Link>
        </nav>
      </div>
    </footer>
  );
}

import Link from "next/link";

const NAV: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Продукт",
    links: [
      { label: "Возможности", href: "#features" },
      { label: "Как это работает", href: "#how" },
      { label: "Отзывы", href: "#testimonials" },
      { label: "Цена", href: "/learn" },
    ],
  },
  {
    heading: "Компания",
    links: [
      { label: "О нас", href: "#" },
      { label: "Блог", href: "#" },
      { label: "Контакты", href: "#" },
    ],
  },
  {
    heading: "Правовое",
    links: [
      { label: "Условия использования", href: "#" },
      { label: "Конфиденциальность", href: "#" },
      { label: "Куки", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)] gap-10 lg:gap-12">
          <div className="max-w-[320px]">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <span
                aria-hidden
                className="h-9 w-9 rounded-[9px] bg-[var(--red)] text-white font-hanzi text-[20px] flex items-center justify-center leading-none"
              >
                字
              </span>
              <span className="text-[18px] font-display font-medium tracking-tight text-[var(--foreground)]">
                Minzi
              </span>
            </Link>
            <p className="text-[13.5px] text-[var(--foreground-muted)] leading-[1.65]">
              Учите китайские иероглифы через письмо, понимание и умные
              повторения.
            </p>
          </div>

          {NAV.map((col) => (
            <div key={col.heading}>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--foreground-soft)] font-medium mb-4">
                {col.heading}
              </div>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center text-[12px] text-[var(--foreground-soft)]">
          <span>© {new Date().getFullYear()} Minzi. Все права защищены.</span>
          <span>Данные: HSK 3.0, Hanzi Writer, MakeMeAHanzi, CC-CEDICT.</span>
        </div>
      </div>
    </footer>
  );
}

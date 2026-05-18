import { Search, PenLine, RefreshCw, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEPS: { n: number; icon: LucideIcon; title: string; body: string }[] = [
  {
    n: 1,
    icon: Search,
    title: "Изучайте",
    body: "Смысл, произношение и примеры использования.",
  },
  {
    n: 2,
    icon: PenLine,
    title: "Пишите",
    body: "Учитесь правильному порядку черт.",
  },
  {
    n: 3,
    icon: RefreshCw,
    title: "Повторяйте",
    body: "Умные интервалы закрепляют знания надолго.",
  },
  {
    n: 4,
    icon: CheckCircle2,
    title: "Применяйте",
    body: "Используйте иероглифы в контексте.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-16 sm:py-24 bg-[var(--surface-2)]">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)] gap-12 lg:gap-16 items-start">
        <div className="lg:pt-4">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--foreground-soft)] mb-4 font-medium">
            Как это работает
          </div>
          <h2 className="font-display font-medium tracking-[-0.02em] leading-[1.08] text-[2.1rem] sm:text-[2.4rem] lg:text-[2.6rem]">
            От первой черты
            <br />
            до уверенного письма
          </h2>
          <p className="mt-5 text-[var(--foreground-muted)] text-[15px] leading-[1.65] max-w-[360px]">
            Пошаговый путь, который делает сложное простым и понятным.
          </p>
        </div>

        <div className="relative">
          {/* Connecting dashed line between steps (desktop) */}
          <div
            aria-hidden
            className="absolute top-[58px] left-[12%] right-[12%] border-t border-dashed border-[var(--border-strong)] hidden md:block"
          />
          <ol className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
            {STEPS.map(({ n, icon: Icon, title, body }) => (
              <li
                key={n}
                className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 pt-7 flex flex-col items-start gap-3 min-h-[200px]"
              >
                <div className="absolute -top-3 left-5 inline-flex items-center justify-center h-6 w-6 rounded-full bg-[var(--green)] text-white text-[11px] font-semibold shadow-[0_2px_6px_-2px_rgba(46,125,79,0.5)]">
                  {n}
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--green-soft)] text-[var(--green-deep)]">
                  <Icon size={16} strokeWidth={1.7} />
                </span>
                <div>
                  <h3 className="font-display font-medium text-[18px] tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] text-[var(--foreground-muted)] leading-relaxed">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

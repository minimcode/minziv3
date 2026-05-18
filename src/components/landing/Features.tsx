import { PenLine, Brush, RefreshCw, BarChart3, ArrowRight } from "lucide-react";

const ITEMS = [
  {
    icon: PenLine,
    title: "Пишите, а не просто смотрите",
    body: "Активное письмо задействует память сильнее, чем чтение.",
    feature: true,
  },
  {
    icon: Brush,
    title: "Правильный порядок черт",
    body: "Анимации и подсказки учат писать точно и красиво.",
  },
  {
    icon: RefreshCw,
    title: "Умные повторения",
    body: "Повторяем в нужный момент, чтобы вы не забывали.",
  },
  {
    icon: BarChart3,
    title: "Отслеживание прогресса",
    body: "Видите свой рост и знаете, над чем работать дальше.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-12 sm:py-16">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ITEMS.map(({ icon: Icon, title, body, feature }) => (
            <article
              key={title}
              className={
                feature
                  ? "rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6 flex flex-col gap-5 min-h-[200px] transition-colors duration-150 hover:bg-[var(--surface-3)]"
                  : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-5 min-h-[200px] transition-colors duration-150 hover:bg-[var(--surface-2)]"
              }
            >
              <span
                className={
                  feature
                    ? "inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(28,35,30,0.06)] border border-[var(--border)] text-[var(--green-deep)]"
                    : "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--green-soft)] text-[var(--green-deep)]"
                }
              >
                <Icon size={18} strokeWidth={1.6} />
              </span>
              <div className="flex-1">
                <h3 className="font-display font-medium text-[18px] tracking-tight leading-snug">
                  {title}
                </h3>
                <p className="text-[14px] text-[var(--foreground-muted)] leading-relaxed mt-2">
                  {body}
                </p>
              </div>
              <ArrowRight
                size={16}
                strokeWidth={1.6}
                className="text-[var(--foreground-soft)]"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

import { PenLine, Brush, RefreshCw, Trophy } from "lucide-react";

const ITEMS = [
  {
    icon: PenLine,
    title: "Пишите, а не просто смотрите",
    body: "Активное письмо задействует память сильнее, чем чтение.",
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
    icon: Trophy,
    title: "Отслеживание прогресса",
    body: "Видите свой рост и знаете, над чем работать дальше.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-10 sm:py-14">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] rounded-lg overflow-hidden border border-[var(--border)]">
          {ITEMS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-[var(--surface)] p-5 sm:p-6 flex items-start gap-4 transition-colors duration-150 hover:bg-[var(--surface-2)]"
            >
              <Icon
                size={18}
                strokeWidth={1.6}
                className="text-[var(--green)] shrink-0 mt-0.5"
              />
              <div>
                <h3 className="font-medium text-[15px] tracking-tight leading-snug">
                  {title}
                </h3>
                <p className="text-sm text-[var(--foreground-muted)] leading-relaxed mt-1.5">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

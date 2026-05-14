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
    <section id="features" className="py-14 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ITEMS.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className="glass rounded-2xl p-6 flex flex-col gap-3 hover-lift"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="h-11 w-11 rounded-xl bg-[var(--green-soft)] text-[var(--green-deep)] flex items-center justify-center">
                <Icon size={20} strokeWidth={1.8} />
              </div>
              <h3 className="font-display font-medium text-lg tracking-tight">
                {title}
              </h3>
              <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

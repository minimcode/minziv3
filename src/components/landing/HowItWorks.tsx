import Image from "next/image";
import Link from "next/link";
import { Volume2, Pause, ArrowRight } from "lucide-react";

const STEPS = [
  {
    n: 1,
    title: "Изучайте значение и произношение",
    body: "Понимайте смысл и контекст использования.",
  },
  {
    n: 2,
    title: "Смотрите порядок черт",
    body: "Смотрите анимацию и запоминайте движения.",
  },
  {
    n: 3,
    title: "Пишите сами",
    body: "Тренируйтесь писать и получайте подсказки.",
  },
  {
    n: 4,
    title: "Закрепляйте и запоминайте",
    body: "Повторяйте в нужный момент и помните надолго.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-14 sm:py-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-14 items-center">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--foreground-soft)] mb-3 font-medium">
            Как проходит обучение
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-display font-medium tracking-[-0.02em] leading-[1.1]">
            От первой черты
            <br />
            до уверенного письма
          </h2>
          <ol className="mt-7 space-y-4">
            {STEPS.map(({ n, title, body }) => (
              <li key={n} className="flex gap-4 items-start">
                <div className="h-7 w-7 shrink-0 rounded-full bg-[var(--green)] text-white flex items-center justify-center text-xs font-semibold">
                  {n}
                </div>
                <div>
                  <div className="font-medium text-[15px] tracking-tight">
                    {title}
                  </div>
                  <div className="text-sm text-[var(--foreground-muted)] mt-0.5 leading-relaxed">
                    {body}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-7">
            <Link href="/learn" className="btn btn-secondary group text-sm">
              Попробовать демо-урок
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-2.5">
          <MockCard title="Значение">
            <div className="hanzi text-6xl text-center">你</div>
            <div className="pinyin text-center text-[var(--foreground-muted)] mt-2">
              nǐ
            </div>
            <div className="text-center text-sm mt-1">ты, вы</div>
            <div className="text-[10px] uppercase tracking-wider mt-3 text-[var(--foreground-soft)]">
              Примеры
            </div>
            <div className="mt-1.5 grid gap-1">
              <Example han="你好" pin="nǐ hǎo" ru="привет" />
              <Example han="你们" pin="nǐ men" ru="вы (мн. ч.)" />
            </div>
          </MockCard>
          <MockCard title="Порядок черт" hi>
            <div className="cali-grid border border-[var(--border)] rounded-md p-1 mt-1">
              <div className="hanzi text-7xl text-center text-[var(--ink)]">
                <span style={{ color: "#c43a3a" }}>你</span>
              </div>
            </div>
            <div className="text-center mt-2.5 text-xs text-[var(--foreground-muted)]">
              2 / 6
            </div>
            <div className="flex items-center justify-center gap-2 mt-2.5">
              <button className="btn btn-ghost h-8 w-8 p-0">
                <ArrowRight size={14} className="rotate-180" />
              </button>
              <button className="btn btn-primary h-9 w-9 p-0">
                <Pause size={14} />
              </button>
              <button className="btn btn-ghost h-8 w-8 p-0">
                <ArrowRight size={14} />
              </button>
            </div>
          </MockCard>
          <MockCard title="Практика">
            <div className="cali-grid border border-[var(--border)] rounded-md p-1">
              <div className="hanzi text-7xl text-center text-[var(--foreground-soft)]">
                你
              </div>
            </div>
            <div className="bg-[var(--surface-2)] rounded-md mt-2.5 px-2.5 py-1.5">
              <div className="text-[var(--foreground-muted)] text-xs">
                你 теперь живёт в вашей библиотеке.
              </div>
            </div>
            <button className="btn btn-primary w-full mt-2.5 h-8 text-xs">
              Далее <ArrowRight size={12} />
            </button>
          </MockCard>
        </div>
      </div>
    </section>
  );
}

function MockCard({
  title,
  hi,
  children,
}: {
  title: string;
  hi?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg p-3 flex flex-col gap-1 bg-[var(--surface)] border border-[var(--border)] shadow-sm ${hi ? "shadow-md scale-[1.03] z-[1]" : ""}`}
    >
      <div className="flex items-center justify-between text-[11px] text-[var(--foreground-muted)]">
        <span className="flex items-center gap-1">
          <ArrowRight size={10} className="rotate-180" /> {title}
        </span>
        <Volume2 size={10} />
      </div>
      {children}
    </div>
  );
}

function Example({
  han,
  pin,
  ru,
}: {
  han: string;
  pin: string;
  ru: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="hanzi text-base">{han}</span>
      <span className="pinyin text-[10px] text-[var(--foreground-muted)]">
        {pin}
      </span>
      <span className="text-[10px] text-[var(--foreground-muted)] ml-auto">
        {ru}
      </span>
    </div>
  );
}

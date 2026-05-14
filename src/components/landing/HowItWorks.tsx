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
    <section id="how" className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-12 items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--green-deep)] mb-4 font-medium">
            Как проходит обучение
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tighter leading-none">
            От первой черты
            <br />
            до уверенного письма
          </h2>
          <ol className="mt-8 space-y-5">
            {STEPS.map(({ n, title, body }) => (
              <li key={n} className="flex gap-4 items-start">
                <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--green)] text-white flex items-center justify-center text-sm font-semibold">
                  {n}
                </div>
                <div>
                  <div className="font-medium tracking-tight">{title}</div>
                  <div className="text-sm text-[var(--foreground-muted)] mt-1 leading-relaxed">
                    {body}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Link href="/learn" className="btn btn-secondary group">
              Попробовать демо-урок
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          <MockCard title="Значение">
            <div className="hanzi text-6xl text-center">你</div>
            <div className="pinyin text-center text-[var(--foreground-muted)] mt-2">
              nǐ
            </div>
            <div className="text-center text-sm mt-1">ты, вы</div>
            <div className="text-[10px] uppercase tracking-wider mt-4 text-[var(--foreground-soft)]">
              Примеры
            </div>
            <div className="mt-2 grid gap-1.5">
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
            <div className="text-center mt-3 text-xs text-[var(--foreground-muted)]">
              2 / 6
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <button className="btn btn-ghost h-9 w-9 p-0">
                <ArrowRight size={14} className="rotate-180" />
              </button>
              <button className="btn btn-primary h-10 w-10 p-0">
                <Pause size={14} />
              </button>
              <button className="btn btn-ghost h-9 w-9 p-0">
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
            <div className="card-soft mt-3 px-2 py-1.5">
              <div className="text-[var(--foreground-muted)] text-xs">
                你 теперь живёт в вашей библиотеке.
              </div>
            </div>
            <button className="btn btn-primary w-full mt-3 h-9 text-xs">
              Далее <ArrowRight size={12} />
            </button>
          </MockCard>
          <Image
            src="/bamboo/bamboo_3.png"
            alt=""
            width={80}
            height={200}
            className="absolute -right-6 -bottom-8 w-20 opacity-70 hidden md:block pointer-events-none"
          />
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
      className={`glass rounded-xl p-3 flex flex-col gap-1 hover-lift ${hi ? "shadow-lg scale-[1.04] z-[1]" : ""}`}
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

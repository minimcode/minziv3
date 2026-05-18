import {
  BrainCircuit,
  CalendarClock,
  MessagesSquare,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

const PILLARS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BrainCircuit,
    title: "Активное воспроизведение",
    body: "Письмо активирует больше областей мозга, чем пассивное чтение.",
  },
  {
    icon: CalendarClock,
    title: "Интервальное повторение",
    body: "Алгоритм подбирает идеальное время для повторения.",
  },
  {
    icon: MessagesSquare,
    title: "Контекст и примеры",
    body: "Вы запоминаете не просто символы, а понимание и применение.",
  },
  {
    icon: CheckCircle2,
    title: "Прогресс наглядно",
    body: "Чёткая статистика помогает видеть свои достижения.",
  },
];

export function WhyItWorks() {
  return (
    <section className="relative overflow-hidden bg-[#143425]">
      {/* Subtle radial light wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_40%,oklch(0.55_0.07_150_/_0.18),transparent_55%)]" />

      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.5fr)] gap-12 lg:gap-16 items-start">
        <div className="lg:pt-2">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[oklch(0.78_0.07_150)] mb-4 font-medium">
            Почему Minzi работает
          </div>
          <h2 className="font-display font-medium tracking-[-0.02em] leading-[1.08] text-white text-[2.1rem] sm:text-[2.4rem] lg:text-[2.6rem]">
            Создано на науке
            <br />о памяти
          </h2>
          <p className="mt-5 text-[oklch(0.84_0.04_145)] text-[14.5px] leading-[1.65] max-w-[380px]">
            Мы используем проверенные методы когнитивной науки, чтобы обучение
            было эффективным и комфортным.
          </p>
          <Link
            href="/learn"
            className="mt-7 inline-flex items-center gap-1.5 text-[14px] text-white border-b border-white/40 hover:border-white pb-0.5 transition-colors"
          >
            Узнать больше о методах
            <ArrowUpRight size={14} strokeWidth={1.7} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-start gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.08] border border-white/10 text-[oklch(0.86_0.1_150)]">
                <Icon size={20} strokeWidth={1.5} />
              </span>
              <div>
                <h3 className="font-display font-medium text-[17px] tracking-tight text-white leading-snug">
                  {title}
                </h3>
                <p className="mt-2 text-[13.5px] text-[oklch(0.78_0.04_145)] leading-relaxed">
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

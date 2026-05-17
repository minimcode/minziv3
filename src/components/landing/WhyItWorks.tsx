import Image from "next/image";
import { Brain, Eye, CalendarDays, Sprout } from "lucide-react";

const ITEMS = [
  {
    icon: Brain,
    title: "Вы пишете",
    body: "Движение рукой активирует моторную память.",
  },
  {
    icon: Eye,
    title: "Вы видите",
    body: "Визуальное восприятие помогает запомнить образ.",
  },
  {
    icon: CalendarDays,
    title: "Вы повторяете",
    body: "Алгоритм повторений закрепляет в нужное время.",
  },
  {
    icon: Sprout,
    title: "Вы запоминаете",
    body: "Информация переходит в долгосрочную память.",
  },
];

export function WhyItWorks() {
  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 bg-[#152e20]" />

      {/* Top/bottom fade transitions into page background */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[var(--background)] to-transparent z-[1]" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--background)] to-transparent z-[1]" />

      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,oklch(0.45_0.06_145_/_0.15),transparent_60%)]" />

      <div className="relative z-[2] max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-10 lg:gap-16 items-center">
          {/* Left: heading + panda */}
          <div className="flex flex-col items-center lg:items-start gap-5 lg:max-w-[280px]">
            <Image
              src="/panda/reading_for_web.png"
              alt=""
              width={200}
              height={200}
              className="w-32 lg:w-40 drop-shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
            />
            <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-display font-medium tracking-[-0.02em] leading-[1.1] text-white text-center lg:text-left">
              Почему это
              <br />
              <span className="text-[oklch(0.82_0.12_150)]">работает</span>
            </h2>
          </div>

          {/* Right: 2x2 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ITEMS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5 transition-colors duration-200 hover:bg-white/[0.07]"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <Icon
                    size={16}
                    strokeWidth={1.6}
                    className="text-[oklch(0.82_0.12_150)]"
                  />
                  <span className="font-medium tracking-tight text-white text-[15px]">
                    {title}
                  </span>
                </div>
                <p className="text-[13px] text-[oklch(0.75_0.03_145)] leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

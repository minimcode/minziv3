import Image from "next/image";

const REVIEWS: { name: string; sub: string; body: string }[] = [
  {
    name: "Анна К.",
    sub: "изучает 8 месяцев",
    body: "Раньше я путалась в чертах и быстро забывала иероглифы. С Minzi всё стало на свои места — пишу красиво и запоминаю надолго.",
  },
  {
    name: "Дмитрий Л.",
    sub: "изучает 1 год",
    body: "Понравился подход через письмо и умные повторения. Прогресс видно с первой недели.",
  },
  {
    name: "Екатерина М.",
    sub: "изучает 6 месяцев",
    body: "Это лучшее приложение для изучения китайского, что я пробовала.",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative overflow-hidden py-16 sm:py-24">
      {/* Ink-wash mountains decoration on the left */}
      <Image
        src="/bg/bg_mist_pine.png"
        alt=""
        width={520}
        height={520}
        className="absolute left-[-80px] bottom-[-40px] w-[340px] lg:w-[420px] opacity-55 pointer-events-none select-none hidden md:block"
      />

      <div className="relative max-w-[1180px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="max-w-[640px] mb-10 sm:mb-12">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--foreground-soft)] mb-3 font-medium">
            Отзывы
          </div>
          <h2 className="font-display font-medium tracking-[-0.02em] leading-[1.08] text-[2.1rem] sm:text-[2.4rem] lg:text-[2.6rem]">
            Что говорят ученики
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {REVIEWS.map((r) => (
            <figure
              key={r.name}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-4 transition-colors duration-150 hover:bg-[var(--surface-2)]"
            >
              <span
                aria-hidden
                className="font-display text-[2.4rem] leading-none text-[var(--foreground-soft)]/55 -mb-2"
              >
                &ldquo;
              </span>
              <blockquote className="text-[14px] text-[var(--foreground)] leading-[1.6] flex-1">
                {r.body}
              </blockquote>
              <figcaption className="flex items-center gap-3 pt-3 border-t border-[var(--border)]/70">
                <div className="h-9 w-9 rounded-full bg-[var(--green-soft)] border border-[var(--border)] flex items-center justify-center text-[13px] font-medium text-[var(--green-deep)] shrink-0">
                  {r.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-[13.5px] text-[var(--foreground)] truncate">
                    {r.name}
                  </div>
                  <div className="text-[12px] text-[var(--foreground-muted)] mt-0.5 truncate">
                    {r.sub}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

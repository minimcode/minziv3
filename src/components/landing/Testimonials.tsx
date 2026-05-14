const REVIEWS = [
  {
    name: "Анна",
    sub: "6 месяцев",
    body: "Раньше постоянно забывала иероглифы. С Minzi наконец начала их писать и лучше понимать. Результат ощущается!",
  },
  {
    name: "Дмитрий",
    sub: "1 год",
    body: "Очень нравится практика письма и подсказки по чертам. Чувствую, как растёт уверенность.",
  },
  {
    name: "Екатерина",
    sub: "6 месяцев",
    body: "Удобные повторения — не надо думать, когда повторять, приложение само напоминает. Очень помогает!",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-xs uppercase tracking-[0.3em] text-[var(--green-deep)] mb-4 font-medium text-center">
          Отзывы
        </div>
        <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tighter leading-none text-center mb-10">
          Что говорят ученики
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REVIEWS.map((r, i) => (
            <figure
              key={r.name}
              className="glass rounded-2xl p-6 relative hover-lift"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[var(--green-soft)] to-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center font-display font-medium text-[var(--green-deep)]">
                  {r.name[0]}
                </div>
                <figcaption>
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="text-xs text-[var(--foreground-muted)]">
                    {r.sub}
                  </div>
                </figcaption>
              </div>
              <blockquote className="text-sm text-[var(--foreground)] leading-relaxed">
                &ldquo;{r.body}&rdquo;
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

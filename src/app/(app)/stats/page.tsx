"use client";

import { useProgress, dueChars } from "@/store/progress";
import { useMounted } from "@/lib/useMounted";
import { Card } from "@/components/ui/Card";
import { Panda } from "@/components/ui/Panda";
import { StreakDots } from "@/components/ui/StreakDots";
import {
  MEMORY_STATES,
  tallyMemoryStates,
  toneClasses,
  type MemoryState,
} from "@/lib/memoryState";

function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${day}.${m}`;
}

const STATE_ORDER: MemoryState[] = [
  "seen",
  "learning",
  "young",
  "mature",
  "rooted",
];

export default function StatsPage() {
  const chars = useProgress((s) => s.chars);
  const daily = useProgress((s) => s.daily);

  // Avoid SSR hydration mismatch around localStorage data.
  const mounted = useMounted();
  if (!mounted) return null;

  const states = tallyMemoryStates(chars);
  const totalAttempts = Object.values(chars).reduce(
    (s, c) => s + c.attempts,
    0
  );
  const dueCount = dueChars(chars).length;
  const hasAnyProgress =
    totalAttempts > 0 || Object.values(chars).some((c) => c.reps > 0);

  const recent = daily.slice(-7);
  const max = Math.max(1, ...recent.map((d) => d.reviewed));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)] mb-1">
          Статистика
        </div>
        <h1 className="text-2xl font-display font-medium">
          Иероглифы в вашей библиотеке
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1 max-w-xl">
          Здесь — состояние каждого иероглифа в вашей памяти. Не очки,
          не баллы. Просто ваша библиотека.
        </p>
      </header>

      {!hasAnyProgress ? (
        <Card className="p-10 flex flex-col items-center text-center gap-4">
          <Panda mood="resting" size={140} />
          <h2 className="text-xl font-display font-medium">Пока пусто</h2>
          <p className="text-sm text-[var(--foreground-muted)] max-w-md">
            Начните с первого иероглифа. Один в день — этого достаточно.
          </p>
        </Card>
      ) : (
        <>
          {/* Five memory states (§4) — replaces binary «Изучено / Уверенно». */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {STATE_ORDER.map((s) => {
              const meta = MEMORY_STATES[s];
              return (
                <div
                  key={s}
                  className={`rounded-[14px] border px-4 py-3 ${toneClasses(meta.tone)}`}
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] opacity-70 mb-1">
                    {meta.label}
                  </div>
                  <div className="text-3xl font-display font-medium tabular-nums leading-none">
                    {states[s]}
                  </div>
                  <div className="text-[11px] opacity-70 mt-1 leading-snug">
                    {meta.hint}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Today's queue — neutral, factual; no urgency. */}
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)] mb-1">
                  Сегодня к повторению
                </div>
                <div className="text-2xl font-display font-medium tabular-nums">
                  {dueCount}
                </div>
              </div>
              <div className="flex-1 max-w-[300px] ml-6">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2">
                  Непрерывность · 30 дней
                </div>
                <StreakDots daily={daily} days={30} columns={30} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-medium">
                Активность · 7 дней
              </h2>
              <span className="text-xs text-[var(--foreground-muted)]">
                иероглифов в день
              </span>
            </div>
            {recent.length === 0 ? (
              <div className="text-sm text-[var(--foreground-muted)] py-2">
                Данных пока нет.
              </div>
            ) : (
              <div className="flex items-end gap-2 h-44">
                {recent.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-t-md bg-[var(--ink)] opacity-80 transition-all"
                      style={{
                        height: `${(d.reviewed / max) * 100}%`,
                        minHeight: 4,
                      }}
                      title={`${d.reviewed} иероглифов`}
                    />
                    <span className="text-[10px] text-[var(--foreground-muted)] tabular-nums">
                      {shortDate(d.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

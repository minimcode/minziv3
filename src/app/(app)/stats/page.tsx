"use client";

import { useProgress, dueChars } from "@/store/progress";
import { useMounted } from "@/lib/useMounted";
import { Card } from "@/components/ui/Card";
import { Panda } from "@/components/ui/Panda";
import { StreakPill } from "@/components/ui/StreakPill";

function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${day}.${m}`;
}

export default function StatsPage() {
  const chars = useProgress((s) => s.chars);
  const daily = useProgress((s) => s.daily);
  const streak = useProgress((s) => s.streak);

  // Avoid SSR hydration mismatch around localStorage data
  const mounted = useMounted();
  if (!mounted) return null;

  const learnedCount = Object.values(chars).filter(
    (c) => c.status === "known" || c.status === "learning"
  ).length;
  const knownCount = Object.values(chars).filter(
    (c) => c.status === "known"
  ).length;
  const dueCount = dueChars(chars).length;
  const totalAttempts = Object.values(chars).reduce(
    (s, c) => s + c.attempts,
    0
  );
  const totalCorrect = Object.values(chars).reduce(
    (s, c) => s + c.correct,
    0
  );
  const accuracy =
    totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100);

  const recent = daily.slice(-7);
  const max = Math.max(1, ...recent.map((d) => d.reviewed));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      <header className="flex items-end justify-between gap-6 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)] mb-1">
            Статистика
          </div>
          <h1 className="text-2xl font-display font-medium">Ваш прогресс</h1>
        </div>
        {streak > 0 && <StreakPill count={streak} />}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Изучено" value={learnedCount} sub="иероглифов" />
        <Stat label="Уверенно" value={knownCount} sub="иероглифов" />
        <Stat label="К повторению" value={dueCount} sub="сегодня" />
        <Stat label="Точность" value={`${accuracy}%`} sub="за всё время" />
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Активность · 7 дней</h2>
          <span className="text-xs text-[var(--foreground-muted)]">
            повторений в день
          </span>
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Panda mood="resting" size={120} />
            <div className="text-sm text-[var(--foreground-muted)]">
              Пока нет данных. Начните урок, чтобы появилась статистика.
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2 h-44">
            {recent.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-[var(--green)] transition-all"
                  style={{
                    height: `${(d.reviewed / max) * 100}%`,
                    minHeight: 6,
                  }}
                  title={`${d.reviewed} повторений`}
                />
                <span className="text-[10px] text-[var(--foreground-muted)] tabular-nums">
                  {shortDate(d.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-1">
        {label}
      </div>
      <div className="text-3xl font-sans font-bold tabular-nums">
        {value}
      </div>
      <div className="text-[11px] text-[var(--foreground-muted)] mt-1">
        {sub}
      </div>
    </Card>
  );
}

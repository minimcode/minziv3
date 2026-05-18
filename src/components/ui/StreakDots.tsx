import type { DailyEntry } from "@/store/progress";
import { cn } from "@/lib/cn";

interface Props {
  /** Activity entries for the past N days. */
  daily: DailyEntry[];
  /** How many days to display (oldest → today, left → right). Defaults to 30. */
  days?: number;
  /** Layout grid width. Defaults to 30 (a single row). */
  columns?: number;
  className?: string;
}

/**
 * Continuity indicator — replaces the streak number (per §13 of the
 * Minzi spec: «The streak number is never shown numerically. The row
 * of dots is the streak»).
 *
 *   • Filled ink dot   → completed day
 *   • Half-filled dot  → today, not yet completed
 *   • Hollow dot       → missed day
 *
 * A missed day does not break anything visually; it simply leaves a
 * hollow dot in the row. Continuity, not perfection.
 */
export function StreakDots({
  daily,
  days = 30,
  columns = 30,
  className,
}: Props) {
  const today = new Date();
  const cells: { date: string; state: "done" | "today" | "miss" }[] = [];
  const todayStr = today.toISOString().slice(0, 10);

  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const entry = daily.find((e) => e.date === key);
    let state: "done" | "today" | "miss";
    if (entry && entry.reviewed > 0) state = "done";
    else if (key === todayStr) state = "today";
    else state = "miss";
    cells.push({ date: key, state });
  }

  return (
    <div
      className={cn("grid gap-1.5", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      role="img"
      aria-label="Активность за последние дни"
    >
      {cells.map((c) => (
        <span
          key={c.date}
          aria-hidden
          className={cn(
            "block aspect-square rounded-full transition-colors",
            c.state === "done" &&
              "bg-[var(--ink)] opacity-80",
            c.state === "today" &&
              "border border-[var(--ink)] bg-[linear-gradient(to_right,var(--ink)_50%,transparent_50%)] opacity-70",
            c.state === "miss" &&
              "border border-[var(--border-strong)] bg-transparent"
          )}
          title={c.date}
        />
      ))}
    </div>
  );
}

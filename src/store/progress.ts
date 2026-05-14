/**
 * Lightweight client-only progress store. Lives in localStorage so guests can
 * use the full app. Authenticated users sync to the database via `/api/progress`.
 */
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Outcome = "again" | "hard" | "good" | "easy";

export interface CharProgress {
  hanzi: string;
  status: "new" | "learning" | "known" | "weak";
  reps: number;
  ease: number;
  intervalDays: number;
  due: number; // ms epoch
  lapses: number;
  attempts: number;
  correct: number;
  favorite: boolean;
  lastSeen?: number;
}

export interface DailyEntry {
  date: string; // YYYY-MM-DD
  reviewed: number;
  learned: number;
  correct: number;
  total: number;
}

interface State {
  chars: Record<string, CharProgress>;
  completedLessons: string[];
  daily: DailyEntry[];
  streak: number;
  streakUpdated: string | null;

  recordOutcome: (hanzi: string, outcome: Outcome) => void;
  toggleFavorite: (hanzi: string) => void;
  completeLesson: (lessonId: string) => void;
  reset: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const init = (hanzi: string): CharProgress => ({
  hanzi,
  status: "new",
  reps: 0,
  ease: 2.5,
  intervalDays: 0,
  due: Date.now(),
  lapses: 0,
  attempts: 0,
  correct: 0,
  favorite: false,
});

const computeNext = (c: CharProgress, outcome: Outcome): CharProgress => {
  let { ease, intervalDays, reps, lapses, attempts, correct } = c;
  attempts += 1;
  if (outcome === "again") {
    lapses += 1;
    reps = 0;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    correct += 1;
    reps += 1;
    if (outcome === "hard") {
      ease = Math.max(1.3, ease - 0.05);
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
    } else if (outcome === "good") {
      intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(intervalDays * ease);
    } else {
      ease = ease + 0.1;
      intervalDays = reps === 1 ? 2 : Math.round(intervalDays * ease * 1.3);
    }
    if (intervalDays === 0) intervalDays = 1;
  }
  const due = Date.now() + intervalDays * 86400_000;
  const status: CharProgress["status"] =
    outcome === "again"
      ? "weak"
      : reps >= 3 && intervalDays >= 7
      ? "known"
      : "learning";
  return { ...c, ease, intervalDays, reps, lapses, attempts, correct, due, status, lastSeen: Date.now() };
};

export const useProgress = create<State>()(
  persist(
    (set) => ({
      chars: {},
      completedLessons: [],
      daily: [],
      streak: 0,
      streakUpdated: null,

      recordOutcome: (hanzi, outcome) =>
        set((s) => {
          const cur = s.chars[hanzi] ?? init(hanzi);
          const next = computeNext(cur, outcome);
          const t = today();
          const daily = [...s.daily];
          const last = daily[daily.length - 1];
          const entry =
            last && last.date === t
              ? last
              : { date: t, reviewed: 0, learned: 0, correct: 0, total: 0 };
          entry.reviewed += 1;
          entry.total += 1;
          if (outcome !== "again") entry.correct += 1;
          if (cur.status === "new") entry.learned += 1;
          if (last && last.date === t) {
            daily[daily.length - 1] = { ...entry };
          } else {
            daily.push({ ...entry });
            if (daily.length > 90) daily.shift();
          }
          // Streak
          let { streak, streakUpdated } = s;
          if (streakUpdated !== t) {
            const yest = new Date();
            yest.setDate(yest.getDate() - 1);
            const yStr = yest.toISOString().slice(0, 10);
            streak = streakUpdated === yStr ? streak + 1 : 1;
            streakUpdated = t;
          }
          return {
            chars: { ...s.chars, [hanzi]: next },
            daily,
            streak,
            streakUpdated,
          };
        }),

      toggleFavorite: (hanzi) =>
        set((s) => {
          const cur = s.chars[hanzi] ?? init(hanzi);
          return {
            chars: { ...s.chars, [hanzi]: { ...cur, favorite: !cur.favorite } },
          };
        }),

      completeLesson: (lessonId) =>
        set((s) =>
          s.completedLessons.includes(lessonId)
            ? s
            : { completedLessons: [...s.completedLessons, lessonId] }
        ),

      reset: () =>
        set({
          chars: {},
          completedLessons: [],
          daily: [],
          streak: 0,
          streakUpdated: null,
        }),
    }),
    { name: "minzi-progress-v1" }
  )
);

/** Returns chars due now, sorted by oldest due. */
export function dueChars(chars: Record<string, CharProgress>): CharProgress[] {
  const now = Date.now();
  return Object.values(chars)
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due);
}

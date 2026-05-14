"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  CharRecord,
  ALL_CHARACTERS,
  meaningShort,
} from "@/lib/characters";
import { Check, X } from "lucide-react";

type TaskKind = "h2m" | "m2h" | "audio";

export interface PracticeTaskResult {
  correct: boolean;
  attempts: number;
}

interface Props {
  /** The character being tested. */
  target: CharRecord;
  /** Pool of distractor characters of comparable difficulty. */
  pool: CharRecord[];
  kind: TaskKind;
  onDone: (r: PracticeTaskResult) => void;
}

/**
 * Stable Fisher–Yates shuffle. We seed from the target hanzi so the order is
 * deterministic for a given target — this avoids React's purity rule against
 * `Math.random()` during render and also makes practice reproducible.
 */
function shuffle<T>(arr: T[], seedKey: string): T[] {
  // Tiny mulberry32-ish PRNG seeded by a string hash.
  let h = 2166136261;
  for (let i = 0; i < seedKey.length; i++) {
    h ^= seedKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function PracticeTask({ target, pool, kind, onDone }: Props) {
  // Pick distractors by ranked frequency proximity rather than random sampling
  // so the choice is pure / reproducible per target.
  const usable = (c: CharRecord) =>
    c.hanzi !== target.hanzi && !!c.pinyin && !!meaningShort(c);

  const buildPool = () => {
    const local = pool.filter(usable);
    if (local.length >= 12) return local;
    // Fall back to the whole HSK character set so we always have enough
    // distractors regardless of how small the user's local pool is.
    const seen = new Set(local.map((c) => c.hanzi));
    for (const c of ALL_CHARACTERS) {
      if (!usable(c)) continue;
      if (seen.has(c.hanzi)) continue;
      local.push(c);
      seen.add(c.hanzi);
      if (local.length >= 50) break;
    }
    return local;
  };
  const candidates = buildPool();
  const sortedByDist = candidates
    .slice()
    .sort((a, b) => Math.abs(a.freq - target.freq) - Math.abs(b.freq - target.freq))
    .slice(0, 12); // top-12 nearest
  const distractors = shuffle(sortedByDist, target.hanzi).slice(0, 3);
  const options = shuffle([...distractors, target], target.hanzi + ":opts");

  const [picked, setPicked] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const correctKey = target.hanzi;
  const isCorrect = picked === correctKey;

  const onPick = (key: string) => {
    if (isCorrect) return;
    setPicked(key);
    if (key === correctKey) {
      setTimeout(
        () => onDone({ correct: attempts === 0, attempts: attempts + 1 }),
        700
      );
    } else {
      setAttempts((a) => a + 1);
      setTimeout(() => setPicked(null), 700);
    }
  };

  const prompt = (() => {
    switch (kind) {
      case "h2m":
        return (
          <>
            <div className="text-sm text-[var(--foreground-muted)]">
              Что означает иероглиф?
            </div>
            <div className="hanzi text-[7rem] leading-none mt-3">
              {target.hanzi}
            </div>
            <div className="pinyin text-[var(--foreground-muted)] mt-1">
              {target.pinyin}
            </div>
          </>
        );
      case "m2h":
        return (
          <>
            <div className="text-sm text-[var(--foreground-muted)]">
              Какой иероглиф соответствует значению?
            </div>
            <div className="text-3xl font-medium mt-3">{meaningShort(target)}</div>
            <div className="pinyin text-[var(--foreground-muted)] mt-1">
              {target.pinyin}
            </div>
          </>
        );
      case "audio":
        return (
          <>
            <div className="text-sm text-[var(--foreground-muted)]">
              Выберите по чтению:
            </div>
            <div className="pinyin text-3xl font-medium mt-3">{target.pinyin}</div>
          </>
        );
    }
  })();

  const renderOption = (c: CharRecord) => {
    // For h→m / audio tasks the user picks a *meaning*, so the option must
    // only show the translated text — never the source hanzi (otherwise the
    // task is trivial). For m→h the user picks the *character*, so the
    // option shows hanzi + pinyin but no meaning.
    const state =
      picked === c.hanzi
        ? c.hanzi === correctKey
          ? "correct"
          : "wrong"
        : "idle";
    return (
      <button
        key={c.hanzi}
        type="button"
        onClick={() => onPick(c.hanzi)}
        className={cn(
          "card text-left px-4 py-3 transition-all flex items-center gap-3 min-h-[3.25rem]",
          state === "correct" &&
            "!border-[color:rgba(46,125,79,0.55)] !bg-[var(--green-soft)]",
          state === "wrong" &&
            "!border-[color:rgba(196,58,58,0.5)] !bg-[var(--red-soft)]"
        )}
      >
        {kind === "m2h" ? (
          <>
            <span className="hanzi text-3xl min-w-[2.5rem] text-center shrink-0">
              {c.hanzi}
            </span>
            <span className="pinyin text-[var(--foreground-muted)] text-sm">
              {c.pinyin}
            </span>
          </>
        ) : (
          <span className="text-base font-medium leading-snug flex-1">
            {meaningShort(c)}
          </span>
        )}
        {state === "correct" && (
          <Check className="ml-auto shrink-0" size={18} stroke="#1f5e3b" />
        )}
        {state === "wrong" && (
          <X className="ml-auto shrink-0" size={18} stroke="#9c2828" />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="text-center">{prompt}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {options.map(renderOption)}
      </div>
      {attempts > 0 && !isCorrect && (
        <div className="text-xs text-[var(--foreground-muted)]">
          Попыток: {attempts}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { Check, X, Lightbulb } from "lucide-react";
import type { SentencePattern } from "@/lib/sentences";

interface Props {
  pattern: SentencePattern;
  onDone: (correct: boolean) => void;
}

/* Stable seeded shuffle so React-purity stays happy and the same pattern
   always produces the same scrambled order. */
function seededShuffle<T>(xs: T[], seedKey: string): T[] {
  let s = 2166136261 >>> 0;
  for (let i = 0; i < seedKey.length; i++) {
    s = Math.imul((s ^ seedKey.charCodeAt(i)) >>> 0, 16777619);
  }
  return xs
    .map((x, i) => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return { x, k: (s + i * 9301) >>> 0 };
    })
    .sort((a, b) => a.k - b.k)
    .map((p) => p.x);
}

/**
 * Sentence Builder — the user assembles a sentence from scrambled tokens.
 *
 * Calm UX:
 *   • soft jade glow on correct tap, ink darkening on wrong
 *   • no timer pressure, no XP, no fanfare
 *   • a single "Готово" check that reveals the grammar note
 */
export function SentenceBuilder({ pattern, onDone }: Props) {
  const scrambledTokens = useMemo(
    () => seededShuffle(pattern.tokens, pattern.id),
    [pattern]
  );
  // Each placed token references its index in `scrambledTokens` so we know
  // which slot in the bank is empty. `null` = empty slot.
  const [placed, setPlaced] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<null | "ok" | "fail">(null);
  const [showNote, setShowNote] = useState(false);

  const tokensInBankCount = scrambledTokens.length - placed.length;
  const allPlaced = placed.length === pattern.tokens.length;

  const place = (i: number) => {
    if (result) return;
    if (placed.includes(i)) return;
    setPlaced((p) => [...p, i]);
  };

  const pop = (slot: number) => {
    if (result) return;
    setPlaced((p) => p.filter((_, i) => i !== slot));
  };

  const check = () => {
    if (result) return;
    const built = placed.map((i) => i !== null && scrambledTokens[i]).join("");
    const expected = pattern.tokens.join("");
    const ok = built === expected;
    setResult(ok ? "ok" : "fail");
    setShowNote(true);
    window.setTimeout(() => onDone(ok), 1400);
  };

  const reset = () => {
    if (result === "ok") return;
    setPlaced([]);
    setResult(null);
    setShowNote(false);
  };

  return (
    <div className="flex flex-col items-center gap-5 float-up w-full">
      <p className="text-sm text-[var(--foreground-muted)]">
        Соберите предложение
      </p>

      {/* Target translation */}
      <div className="text-center max-w-md">
        <div className="text-lg font-display text-[var(--foreground)] leading-snug">
          «{pattern.ru}»
        </div>
        <div className="pinyin text-xs text-[var(--foreground-muted)] mt-1">
          {pattern.pinyin}
        </div>
      </div>

      {/* Assembly area */}
      <div
        className={cn(
          "card w-full max-w-xl px-4 py-5 sm:px-6 sm:py-6 min-h-[88px] flex flex-wrap gap-2 items-center justify-center transition-all",
          result === "ok" &&
            "ring-2 ring-[var(--green)] shadow-[0_0_24px_-4px_rgba(46,125,79,0.35)]",
          result === "fail" && "ring-2 ring-[var(--red)]/40"
        )}
      >
        {placed.length === 0 ? (
          <span className="text-sm text-[var(--foreground-soft)]">
            Нажимайте на карточки ниже, чтобы собрать фразу
          </span>
        ) : (
          placed.map((i, slot) =>
            i !== null ? (
              <button
                key={`${slot}-${i}`}
                type="button"
                onClick={() => pop(slot)}
                disabled={!!result}
                className="hanzi text-3xl sm:text-4xl px-4 py-2 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-100"
              >
                {scrambledTokens[i]}
              </button>
            ) : null
          )
        )}
      </div>

      {/* Token bank */}
      <div className="flex flex-wrap gap-2 justify-center max-w-xl">
        {scrambledTokens.map((tok, i) => {
          const used = placed.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => place(i)}
              disabled={used || !!result}
              className={cn(
                "hanzi text-3xl sm:text-4xl px-4 py-2 rounded-[var(--radius-md)] border transition-all",
                used
                  ? "bg-[var(--surface-3)] border-[var(--surface-3)] text-[var(--foreground-soft)] cursor-default"
                  : "bg-white border-[var(--border)] hover:border-[var(--green)] hover:shadow-sm active:scale-[0.97]"
              )}
            >
              {tok}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          disabled={result === "ok" || placed.length === 0}
          className="btn btn-ghost text-sm"
        >
          Сброс
        </button>
        <button
          type="button"
          onClick={check}
          disabled={!allPlaced || !!result}
          className={cn(
            "btn",
            result === "ok"
              ? "btn-success"
              : result === "fail"
              ? "btn-secondary"
              : allPlaced
              ? "btn-success"
              : "btn-secondary"
          )}
        >
          {result === "ok" ? (
            <>
              <Check size={16} /> Верно
            </>
          ) : result === "fail" ? (
            <>
              <X size={16} /> Попробуйте порядок
            </>
          ) : (
            <>Проверить · осталось {tokensInBankCount}</>
          )}
        </button>
      </div>

      {/* Explanation — always available after a check, also accessible
          beforehand as a hint */}
      {(showNote || result) && (
        <div className="w-full max-w-xl card-soft p-4 flex gap-3 items-start float-up">
          <Lightbulb size={16} className="text-[var(--green-deep)] mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm">
            <div className="font-medium text-[var(--foreground)]">
              {pattern.tokens.join(" · ")}
              {pattern.particle && (
                <span className="ml-2 text-xs text-[var(--green-deep)] bg-[var(--green-soft)] rounded-full px-2 py-0.5">
                  частица {pattern.particle}
                </span>
              )}
            </div>
            <p className="text-[var(--foreground-muted)] leading-snug">
              {pattern.note}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

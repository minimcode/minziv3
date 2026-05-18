"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ImageMatchEntry } from "@/lib/sentences";
import { getChar } from "@/lib/characters";

interface Props {
  entry: ImageMatchEntry;
  options: string[]; // hanzi options including the correct one
  onAnswer: (correct: boolean) => void;
}

/**
 * Image Match — show one calm emoji "scene" and four hanzi options.
 *
 * Why emoji and not photographs? Two reasons aligned with §6 «calm»:
 *   • photographs leak culture (a Coca-Cola can next to 茶 implies «soda»),
 *     emoji let the meaning stay generic;
 *   • a single emoji on rice paper reads like a sumi-e brush stroke. It
 *     fits the bamboo/ink visual language without flashy imagery.
 */
export function ImageMatch({ entry, options, onAnswer }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);

  const handle = (opt: string) => {
    if (chosen) return;
    setChosen(opt);
    const ok = opt === entry.hanzi;
    window.setTimeout(() => onAnswer(ok), 900);
  };

  return (
    <div className="flex flex-col items-center gap-6 float-up">
      <p className="text-sm text-[var(--foreground-muted)]">
        Выберите иероглиф, который соответствует образу
      </p>

      {/* Image scene */}
      <div
        className={cn(
          "card-soft w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center text-7xl sm:text-8xl select-none transition-all",
          chosen === entry.hanzi &&
            "ring-2 ring-[var(--green)] shadow-[0_0_28px_-6px_rgba(46,125,79,0.35)]",
          chosen && chosen !== entry.hanzi && "ring-2 ring-[var(--red)]/40"
        )}
        aria-label={entry.ru}
      >
        <span aria-hidden>{entry.emoji}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {options.map((opt) => {
          const c = getChar(opt);
          const isCorrect = opt === entry.hanzi;
          const isChosen = chosen === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handle(opt)}
              disabled={chosen !== null}
              className={cn(
                "rounded-[var(--radius-md)] border px-4 py-4 flex flex-col items-center gap-1 transition-all",
                chosen === null && "hover:border-[var(--green)] hover:shadow-sm bg-white border-[var(--border)]",
                isChosen && isCorrect && "border-[var(--green)] bg-[var(--green-soft)] ring-2 ring-[var(--green)]",
                isChosen && !isCorrect && "border-[var(--red)] bg-[var(--red-soft)] ring-2 ring-[var(--red)]",
                chosen && !isChosen && isCorrect && "border-[var(--green)] bg-[var(--green-soft)]",
                chosen && !isChosen && !isCorrect && "border-[var(--border)] bg-white opacity-70"
              )}
            >
              <span className="hanzi text-3xl">{opt}</span>
              {c && (
                <span className="pinyin text-[10px] text-[var(--foreground-muted)]">
                  {c.pinyin}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {chosen && (
        <div className="text-center float-up">
          <div className="hanzi text-2xl">{entry.hanzi}</div>
          <div className="pinyin text-xs text-[var(--foreground-muted)] mt-0.5">
            {entry.pinyin}
          </div>
          <div className="text-sm font-medium mt-1">{entry.ru}</div>
        </div>
      )}
    </div>
  );
}

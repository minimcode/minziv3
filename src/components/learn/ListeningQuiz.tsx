"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { playChinese } from "@/lib/audio";
import { meaningShort, type CharRecord } from "@/lib/characters";

interface Props {
  target: CharRecord;
  options: CharRecord[]; // exactly 4, including target
  onAnswer: (correct: boolean) => void;
  /** Pass true to label the quiz as «какой тон вы услышали?» */
  toneVariant?: boolean;
}

/**
 * Listening Quiz — play the target's audio, ask the user to pick the hanzi.
 *
 * Distractor pool is chosen by `buildListeningQuiz` (see lib/listening.ts) so
 * the four options share visual/aural rhythm — typically same pinyin syllable
 * different tone, which is the hardest HSK listening challenge in practice.
 */
export function ListeningQuiz({ target, options, onAnswer, toneVariant }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const playedOnce = useRef(false);

  // Auto-play once on mount so the exercise feels active, not a button-hunt.
  useEffect(() => {
    if (playedOnce.current) return;
    playedOnce.current = true;
    void playChinese(target.hanzi);
  }, [target.hanzi]);

  const handle = (opt: CharRecord) => {
    if (chosen) return;
    setChosen(opt.hanzi);
    const ok = opt.hanzi === target.hanzi;
    window.setTimeout(() => onAnswer(ok), 900);
  };

  const replay = () => {
    void playChinese(target.hanzi);
  };

  return (
    <div className="flex flex-col items-center gap-6 float-up">
      <p className="text-sm text-[var(--foreground-muted)]">
        {toneVariant
          ? "Прослушайте и выберите правильный тон"
          : "Прослушайте и выберите иероглиф"}
      </p>

      <button
        type="button"
        onClick={replay}
        className={cn(
          "card-soft w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center select-none transition-all",
          "hover:shadow-md active:scale-[0.98]"
        )}
        aria-label="Прослушать ещё раз"
      >
        <Volume2 size={56} className="text-[var(--foreground-muted)]" />
      </button>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {options.map((opt) => {
          const isCorrect = opt.hanzi === target.hanzi;
          const isChosen = chosen === opt.hanzi;
          return (
            <button
              key={opt.hanzi}
              type="button"
              onClick={() => handle(opt)}
              disabled={chosen !== null}
              className={cn(
                "rounded-[var(--radius-md)] border px-4 py-4 flex flex-col items-center gap-1 transition-all",
                chosen === null &&
                  "hover:border-[var(--green)] hover:shadow-sm bg-white border-[var(--border)]",
                isChosen &&
                  isCorrect &&
                  "border-[var(--green)] bg-[var(--green-soft)] ring-2 ring-[var(--green)]",
                isChosen &&
                  !isCorrect &&
                  "border-[var(--red)] bg-[var(--red-soft)] ring-2 ring-[var(--red)]",
                chosen &&
                  !isChosen &&
                  isCorrect &&
                  "border-[var(--green)] bg-[var(--green-soft)]",
                chosen &&
                  !isChosen &&
                  !isCorrect &&
                  "border-[var(--border)] bg-white opacity-70"
              )}
            >
              <span className="hanzi text-3xl">{opt.hanzi}</span>
              {opt.pinyin && (
                <span className="pinyin text-[10px] text-[var(--foreground-muted)]">
                  {opt.pinyin}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {chosen && (
        <div className="text-center float-up">
          <div className="hanzi text-2xl">{target.hanzi}</div>
          <div className="pinyin text-xs text-[var(--foreground-muted)] mt-0.5">
            {target.pinyin}
          </div>
          <div className="text-sm font-medium mt-1">{meaningShort(target)}</div>
        </div>
      )}
    </div>
  );
}

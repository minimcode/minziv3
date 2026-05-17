"use client";

import { Volume2 } from "lucide-react";
import { playChinese } from "@/lib/audio";
import { wordMeaningShort, type WordRecord } from "@/lib/words";

interface Props {
  words: WordRecord[];
}

/**
 * Vocabulary panel shown after the per-character drills. The user has
 * just written all of the lesson's hanzi by hand, so we surface a small
 * batch of real multi-character words that combine those hanzi with
 * already-studied chars from earlier lessons. No quiz — this stage is
 * pure exposure ("вот как они склеиваются в слова"), matched to the
 * spec's calm tempo: a single screen, one tap per word for audio.
 */
export function WordList({ words }: Props) {
  return (
    <div className="flex flex-col items-stretch gap-4 float-up w-full">
      <p className="text-sm text-[var(--foreground-muted)] text-center">
        Из этих иероглифов уже складываются слова
      </p>

      <ul className="flex flex-col divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
        {words.map((w) => {
          const meaning = wordMeaningShort(w);
          return (
            <li
              key={w.word}
              className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-4"
            >
              <div className="flex-1 min-w-0">
                <div className="hanzi text-2xl sm:text-3xl leading-tight">
                  {w.word}
                </div>
                <div className="pinyin text-xs sm:text-sm text-[var(--foreground-muted)] mt-0.5">
                  {w.pinyin}
                </div>
                {meaning && (
                  <div className="text-sm sm:text-base text-[var(--foreground)] mt-1 leading-snug">
                    {meaning}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void playChinese(w.word)}
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:shadow-sm transition-shadow"
                aria-label={`Произнести ${w.word}`}
              >
                <Volume2 size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

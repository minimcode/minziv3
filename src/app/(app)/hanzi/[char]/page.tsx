"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getChar } from "@/lib/characters";
import { useProgress } from "@/store/progress";
import { useMounted } from "@/lib/useMounted";
import { Card } from "@/components/ui/Card";
import { StrokeAnimation } from "@/components/learn/StrokeAnimation";
import {
  MEMORY_STATES,
  memoryStateFor,
  toneClasses,
} from "@/lib/memoryState";

/**
 * §15 / §19.5 #2 — Per-hanzi page.
 *
 * Shows the five learning dimensions (§3): recognition, recall,
 * writing, pronunciation, usage. Until per-dimension SRS lands the
 * scores are derived from aggregate `CharProgress`:
 *
 *   recognition  ← any successful recall
 *   recall       ← reps >= 2 with no recent lapse
 *   writing      ← `attempts > 0`, scaled by 1 - mistakeRate
 *   pronunciation← treated as parity of `recognition` (audio TBD)
 *   usage        ← treated as parity of `recall` (context TBD)
 *
 * Each dimension is shown as a 0–4 dot gauge — never a percentage.
 */
type Dimension =
  | "recognition"
  | "recall"
  | "writing"
  | "pronunciation"
  | "usage";

const DIM_LABEL: Record<Dimension, string> = {
  recognition: "Узнаю",
  recall: "Вспоминаю",
  writing: "Пишу",
  pronunciation: "Говорю",
  usage: "Применяю",
};

const DIM_HINT: Record<Dimension, string> = {
  recognition: "Видение → значение.",
  recall: "Значение → форма.",
  writing: "Воспроизведение от руки.",
  pronunciation: "Тон и звучание.",
  usage: "В живых предложениях.",
};

function clamp04(v: number): 0 | 1 | 2 | 3 | 4 {
  if (v <= 0) return 0;
  if (v >= 4) return 4;
  return Math.round(v) as 0 | 1 | 2 | 3 | 4;
}

export default function HanziDetailPage({
  params,
}: {
  params: Promise<{ char: string }>;
}) {
  const { char: rawChar } = use(params);
  const char = decodeURIComponent(rawChar);
  const c = getChar(char);
  const chars = useProgress((s) => s.chars);
  const mounted = useMounted();

  const p = mounted ? chars[char] : undefined;
  const state = memoryStateFor(p);
  const meta = MEMORY_STATES[state];

  // Derive 0–4 dimension gauges from the aggregate CharProgress.
  // These are placeholders until §5 per-dimension FSRS lands.
  const gauges = useMemo<Record<Dimension, 0 | 1 | 2 | 3 | 4>>(() => {
    if (!p) {
      return {
        recognition: 0,
        recall: 0,
        writing: 0,
        pronunciation: 0,
        usage: 0,
      };
    }
    const recog =
      p.reps === 0 ? 0 : Math.min(4, 1 + Math.floor(p.reps / 2));
    const recall =
      p.reps === 0 ? 0 : Math.min(4, p.reps - p.lapses);
    const correctRate =
      p.attempts > 0 ? Math.max(0, Math.min(1, p.correct / p.attempts)) : 0;
    const writingScore = p.attempts === 0 ? 0 : 4 * correctRate;
    return {
      recognition: clamp04(recog),
      recall: clamp04(recall),
      writing: clamp04(writingScore),
      pronunciation: clamp04(recog - 1),
      usage: clamp04(recall - 1),
    };
  }, [p]);

  if (!c) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-display font-medium mb-2">
          Иероглиф не найден
        </h1>
        <Link
          href="/garden"
          className="text-sm text-[var(--foreground-muted)] inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> В сад
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
      <Link
        href="/garden"
        className="text-xs text-[var(--foreground-muted)] inline-flex items-center gap-1.5 mb-6 hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={12} /> Сад
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 mb-8">
        <div className="flex flex-col items-center">
          {c.hasStrokes ? (
            <StrokeAnimation hanzi={c.hanzi} size={220} autoplay={false} />
          ) : (
            <div className="hanzi text-[140px] leading-none">{c.hanzi}</div>
          )}
          <div className="pinyin text-xl mt-3">{c.pinyin}</div>
        </div>

        <div>
          <div
            className={`inline-flex items-baseline gap-2 rounded-full border px-3 py-1 text-xs ${toneClasses(meta.tone)}`}
          >
            <span className="uppercase tracking-[0.18em]">{meta.label}</span>
            <span className="opacity-70">{meta.hint}</span>
          </div>

          <h1 className="hanzi text-5xl font-medium mt-4">{c.hanzi}</h1>
          <p className="text-lg text-[var(--foreground)] mt-1">
            {c.meaningsRu?.[0] || c.meaningPrimary}
          </p>
          {c.meaningsRu && c.meaningsRu.length > 1 && (
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              {c.meaningsRu.slice(1).join(" · ")}
            </p>
          )}

          {c.components && c.components.length > 0 && (
            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-1.5">
                Состав
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.components.map((cp, i) => (
                  <span
                    key={i}
                    className="hanzi text-2xl rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1"
                  >
                    {cp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-1">
          Пять измерений
        </div>
        <h2 className="text-lg font-display font-medium mb-4">
          Как живёт этот иероглиф в вашей памяти
        </h2>
        <div className="space-y-3">
          {(Object.keys(DIM_LABEL) as Dimension[]).map((d) => (
            <div
              key={d}
              className="grid grid-cols-[120px_auto_1fr] items-center gap-3"
            >
              <span className="text-sm">{DIM_LABEL[d]}</span>
              <DotsRow value={gauges[d]} />
              <span className="text-xs text-[var(--foreground-soft)]">
                {DIM_HINT[d]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-[var(--foreground-soft)] mt-4 max-w-lg">
        Каждое измерение — отдельная нить памяти. Они растут не вместе,
        а как лоза по решётке.
      </p>
    </div>
  );
}

function DotsRow({ value }: { value: 0 | 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${value} из 4`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={
            i < value
              ? "h-2.5 w-2.5 rounded-full bg-[var(--ink)]"
              : "h-2.5 w-2.5 rounded-full border border-[var(--border-strong)]"
          }
        />
      ))}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { RotateCcw } from "lucide-react";

interface Props {
  hanzi: string;
  size?: number;
  className?: string;
  showOutline?: boolean;
  hideInitialFeedback?: boolean;
  onMistake?: () => void;
  onCorrectStroke?: (i: number, total: number) => void;
  onComplete?: (info: { totalMistakes: number; totalStrokes: number }) => void;
}

interface WriterAPI {
  quiz: (opts: {
    onMistake?: (info: { strokeNum: number; mistakesOnStroke: number }) => void;
    onCorrectStroke?: (info: {
      strokeNum: number;
      strokesRemaining: number;
    }) => void;
    onComplete?: (info: { totalMistakes: number }) => void;
    showHintAfterMisses?: number;
  }) => void;
  cancelQuiz: () => void;
  showCharacter: (opts?: { duration?: number }) => void;
  getCharacterData: () => Promise<{ strokes: unknown[] }>;
}

/**
 * Writing canvas. Per §7 of the Minzi spec («the no-fail philosophy»):
 * a wrong stroke fades silently — no red banner, no «Wrong!» text — and
 * the canvas returns to its previous state. The only on-screen reward
 * is the stroke itself transitioning to full ink.
 */
export function WritingQuiz({
  hanzi,
  size = 300,
  className,
  showOutline = true,
  hideInitialFeedback = false,
  onMistake,
  onCorrectStroke,
  onComplete,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<WriterAPI | null>(null);
  const [strokeIdx, setStrokeIdx] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);
  // We surface one quiet instruction line on the first render so it's clear
  // what the user is being asked to do. After that, the canvas speaks for
  // itself — successes ink in, failures fade silently.
  const [instruction, setInstruction] = useState<string | null>(
    hideInitialFeedback
      ? null
      : showOutline
      ? "Пишите по образцу."
      : "Напишите по памяти."
  );

  const onCompleteRef = useRef(onComplete);
  const onMistakeRef = useRef(onMistake);
  const onCorrectStrokeRef = useRef(onCorrectStroke);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onMistakeRef.current = onMistake; }, [onMistake]);
  useEffect(() => { onCorrectStrokeRef.current = onCorrectStroke; }, [onCorrectStroke]);

  useEffect(() => {
    let cancelled = false;
    const node = containerRef.current;
    if (!node) return;
    node.innerHTML = "";

    (async () => {
      try {
        const HanziWriter = (await import("hanzi-writer")).default;
        if (cancelled || !containerRef.current) return;
        const writer = HanziWriter.create(containerRef.current, hanzi, {
          width: size,
          height: size,
          padding: 8,
          showCharacter: false,
          showOutline,
          // sumi-ink for correct strokes; warm grey for the in-progress
          // attempt. Mistakes draw in light grey and fade — never red.
          // After 2 misses Hanzi Writer highlights the correct stroke as a
          // hint; we render that hint in jade-green so it's unambiguously
          // visible against the dark ink character.
          strokeColor: "#1A1814",
          outlineColor: "#e6e3da",
          drawingColor: "#9ca09a",
          highlightColor: "#2e7d4f",
          highlightOnComplete: false,
          // Per §7 of the spec: stroke 2 misses → dotted guide; stroke
          // 3 misses → ghost outline. Hanzi Writer surfaces both via the
          // same hint mechanism.
          showHintAfterMisses: 2,
          charDataLoader(c, onCompleteCb) {
            fetch(
              `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${encodeURIComponent(
                c
              )}.json`
            )
              .then((r) => r.json())
              .then((d) => onCompleteCb(d))
              .catch(() => onCompleteCb(null as unknown as never));
          },
        }) as unknown as WriterAPI;
        writerRef.current = writer;

        const data = await writer.getCharacterData();
        if (cancelled) return;
        setTotalStrokes(data.strokes.length);
        writer.quiz({
          showHintAfterMisses: 2,
          onMistake: () => {
            if (cancelled) return;
            // Silence is the feedback. Just forward the event upstream so
            // the parent can count attempts.
            onMistakeRef.current?.();
          },
          onCorrectStroke: (info) => {
            if (cancelled) return;
            const done = info.strokeNum + 1;
            setStrokeIdx(done);
            // Clear the initial instruction once writing starts; the
            // stroke-by-stroke ink darkening is the reward.
            setInstruction(null);
            onCorrectStrokeRef.current?.(info.strokeNum, data.strokes.length);
          },
          onComplete: (info) => {
            if (cancelled) return;
            setTimeout(() => {
              writer.showCharacter();
            }, 100);
            // The closing copy belongs to the lesson stage (Settle), not
            // this widget — so we say nothing here.
            setInstruction(null);
            onCompleteRef.current?.({
              totalMistakes: info.totalMistakes,
              totalStrokes: data.strokes.length,
            });
          },
        });
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
      writerRef.current?.cancelQuiz?.();
    };
  }, [hanzi, size, showOutline]);

  const restart = useCallback(() => {
    if (containerRef.current) containerRef.current.innerHTML = "";
    setStrokeIdx(0);
    setInstruction(showOutline ? "Пишите по образцу." : "Напишите по памяти.");
    const writer = writerRef.current as { quiz?: WriterAPI["quiz"] } | null;
    if (writer && writer.quiz) {
      writer.quiz({
        onMistake: () => onMistakeRef.current?.(),
        onCorrectStroke: (info) => {
          setStrokeIdx(info.strokeNum + 1);
          setInstruction(null);
          onCorrectStrokeRef.current?.(info.strokeNum, totalStrokes);
        },
        onComplete: (info) => {
          setTimeout(() => {
            writerRef.current?.showCharacter();
          }, 100);
          setInstruction(null);
          onCompleteRef.current?.({
            totalMistakes: info.totalMistakes,
            totalStrokes,
          });
        },
      });
    }
  }, [totalStrokes, showOutline]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className="relative cali-grid rounded-[18px] border border-[var(--border)] bg-white"
        style={{ width: size + 24, height: size + 24, padding: 12 }}
      >
        <div ref={containerRef} aria-label={`Письмо по образцу: ${hanzi}`} />
      </div>
      <div className="flex items-center gap-3 w-full max-w-[320px]">
        <span className="text-xs text-[var(--foreground-muted)] tabular-nums">
          {strokeIdx} / {totalStrokes || "…"}
        </span>
        <div className="h-1.5 flex-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-[width]"
            style={{
              width: totalStrokes
                ? `${Math.min(100, (strokeIdx / totalStrokes) * 100)}%`
                : "0%",
            }}
          />
        </div>
        <button
          type="button"
          onClick={restart}
          className="btn btn-ghost h-9 w-9 p-0"
          aria-label="Начать заново"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      {instruction && (
        <div
          className="px-4 py-2 text-sm text-center text-[var(--foreground-muted)] max-w-[360px]"
          aria-live="polite"
        >
          {instruction}
        </div>
      )}
    </div>
  );
}

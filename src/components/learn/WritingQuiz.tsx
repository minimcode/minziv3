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
  const [feedback, setFeedback] = useState<
    null | { tone: "ok" | "warn" | "info"; text: string }
  >(hideInitialFeedback ? null : { tone: "info", text: showOutline ? "Пишите по образцу — система проверит порядок и направление черт." : "Напишите иероглиф по памяти. Система проверит порядок и направление черт." });

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
          strokeColor: "#2a2c28",
          outlineColor: "#e6e3da",
          drawingColor: "#c43a3a",
          highlightColor: "#2e7d4f",
          highlightOnComplete: false,
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
          onMistake: (info) => {
            if (cancelled) return;
            setFeedback({
              tone: "warn",
              text:
                info.mistakesOnStroke >= 2
                  ? "Подсказка появится сейчас — посмотри на правильное направление."
                  : "Не та черта — попробуй ещё раз. Обратите внимание на направление.",
            });
            onMistakeRef.current?.();
          },
          onCorrectStroke: (info) => {
            if (cancelled) return;
            const done = info.strokeNum + 1;
            setStrokeIdx(done);
            setFeedback({ tone: "ok", text: "Верно. Следующая черта." });
            onCorrectStrokeRef.current?.(info.strokeNum, data.strokes.length);
          },
          onComplete: (info) => {
            if (cancelled) return;
            setTimeout(() => {
              writer.showCharacter();
            }, 100);
            setFeedback({
              tone: "ok",
              text:
                info.totalMistakes === 0
                  ? "Отлично! Без ошибок."
                  : `Готово! Ошибок: ${info.totalMistakes}.`,
            });
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
    setFeedback({ tone: "info", text: "Начинаем заново." });
    const writer = writerRef.current as { quiz?: WriterAPI["quiz"] } | null;
    if (writer && writer.quiz) {
      writer.quiz({
        onMistake: () => onMistakeRef.current?.(),
        onCorrectStroke: (info) => {
          setStrokeIdx(info.strokeNum + 1);
          onCorrectStrokeRef.current?.(info.strokeNum, totalStrokes);
        },
        onComplete: (info) => {
          setTimeout(() => {
            writerRef.current?.showCharacter();
          }, 100);
          onCompleteRef.current?.({
            totalMistakes: info.totalMistakes,
            totalStrokes,
          });
        },
      });
    }
  }, [totalStrokes]);

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
      {feedback && (
        <div
          className={cn(
            "rounded-[14px] border px-4 py-2.5 text-sm float-up max-w-[360px] text-center",
            feedback.tone === "ok" &&
              "border-[color:rgba(46,125,79,0.25)] bg-[var(--green-soft)] text-[var(--green-deep)]",
            feedback.tone === "warn" &&
              "border-[color:rgba(196,58,58,0.22)] bg-[var(--red-soft)] text-[var(--red-deep)]",
            feedback.tone === "info" &&
              "border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground-muted)]"
          )}
        >
          {feedback.text}
        </div>
      )}
    </div>
  );
}

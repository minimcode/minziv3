"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Play, Pause, RotateCcw } from "lucide-react";

interface Props {
  hanzi: string;
  size?: number;
  className?: string;
  autoplay?: boolean;
  /** Called when the data is loaded (and stroke count is known). */
  onReady?: (totalStrokes: number) => void;
}

interface WriterAPI {
  animateCharacter: (opts?: { onComplete?: () => void }) => Promise<void>;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  getCharacterData: () => Promise<{ strokes: unknown[] }>;
}

export function StrokeAnimation({
  hanzi,
  size = 300,
  className,
  autoplay = true,
  onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<WriterAPI | null>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          showCharacter: true,
          showOutline: true,
          strokeAnimationSpeed: 1.1,
          delayBetweenStrokes: 220,
          // Single stroke colour — never auto-recolour radicals, that's
          // confusing without explanation. Selection-based highlighting
          // happens at the parent level via the <Graphemes /> component.
          strokeColor: "#2a2c28",
          radicalColor: "#2a2c28",
          outlineColor: "#dad7cf",
          drawingColor: "#c43a3a",
          // Tells the writer to fetch from chanind/hanzi-writer-data CDN.
          charDataLoader(c, onComplete) {
            fetch(
              `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${encodeURIComponent(
                c
              )}.json`
            )
              .then((r) => r.json())
              .then((d) => onComplete(d))
              .catch(() => onComplete(null as unknown as never));
          },
        }) as unknown as WriterAPI;
        writerRef.current = writer;
        writer
          .getCharacterData()
          .then((data) => {
            if (cancelled) return;
            onReady?.(data.strokes.length);
            if (autoplay) {
              setPlaying(true);
              writer
                .animateCharacter({
                  onComplete: () => {
                    setPlaying(false);
                    setPaused(false);
                  },
                })
                .catch(() => {
                  setPlaying(false);
                  setPaused(false);
                });
            }
          })
          .catch(() => setError("Не удалось загрузить данные иероглифа."));
      } catch (e) {
        if (!cancelled) setError("Ошибка загрузки модуля письма.");
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hanzi, size, autoplay, onReady]);

  const replay = () => {
    const writer = writerRef.current;
    if (!writer) return;
    setPaused(false);
    setPlaying(true);
    writer
      .animateCharacter({
        onComplete: () => {
          setPlaying(false);
          setPaused(false);
        },
      })
      .catch(() => {
        setPlaying(false);
        setPaused(false);
      });
  };

  const togglePause = () => {
    const writer = writerRef.current;
    if (!writer) return;
    if (!playing) {
      replay();
      return;
    }
    if (paused) {
      writer.resumeAnimation();
      setPaused(false);
    } else {
      writer.pauseAnimation();
      setPaused(true);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className="relative cali-grid rounded-[18px] border border-[var(--border)] bg-white"
        style={{ width: size + 24, height: size + 24, padding: 12 }}
      >
        <div ref={containerRef} aria-label={`Анимация порядка черт: ${hanzi}`} />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--foreground-muted)] px-4 text-center">
            {error}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={replay}
          disabled={!!error}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--border)] bg-white text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:shadow-sm transition-shadow"
          aria-label="Заново"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={togglePause}
          disabled={!!error}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--border)] bg-white text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:shadow-sm transition-shadow"
          aria-label={
            !playing
              ? "Воспроизвести"
              : paused
                ? "Продолжить"
                : "Пауза"
          }
        >
          {!playing || paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
    </div>
  );
}

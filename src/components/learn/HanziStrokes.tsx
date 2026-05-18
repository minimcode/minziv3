"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface CharData {
  strokes: string[];
}

const cache = new Map<string, Promise<CharData | null>>();

function loadCharData(hanzi: string): Promise<CharData | null> {
  let p = cache.get(hanzi);
  if (p) return p;
  p = fetch(
    `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${encodeURIComponent(
      hanzi
    )}.json`
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  cache.set(hanzi, p);
  return p;
}

interface Props {
  hanzi: string;
  size?: number;
  /**
   * Indices of strokes to highlight in green. Other strokes are dimmed.
   * `null` / undefined → no highlighting (every stroke rendered in default
   * colour).
   */
  highlightedStrokes?: number[] | null;
  className?: string;
  /** Render with the calligraphy grid backdrop. Defaults to true. */
  grid?: boolean;
}

/**
 * Static, inline SVG rendering of a Chinese character based on the
 * MakeMeAHanzi / chanind hanzi-writer stroke set. Lets us colour individual
 * strokes from the parent (e.g. when a grapheme is selected). All strokes
 * fit a 1024×1024 SVG with the standard MakeMeAHanzi y-flip transform.
 */
interface DataState {
  hanzi: string;
  data: CharData | null;
  error: boolean;
}

export function HanziStrokes({
  hanzi,
  size = 220,
  highlightedStrokes,
  className,
  grid = true,
}: Props) {
  // Track which hanzi the loaded data belongs to, so we can render a
  // placeholder while a different character is being fetched without ever
  // calling setState synchronously inside the effect (forbidden by Next.js
  // 16 / React Compiler lint rule react-hooks/set-state-in-effect).
  const [state, setState] = useState<DataState>({
    hanzi,
    data: null,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;
    loadCharData(hanzi).then((d) => {
      if (cancelled) return;
      setState({ hanzi, data: d, error: !d });
    });
    return () => {
      cancelled = true;
    };
  }, [hanzi]);

  const ready = state.hanzi === hanzi;
  const data = ready ? state.data : null;
  const error = ready ? state.error : false;

  const hasHighlight =
    Array.isArray(highlightedStrokes) && highlightedStrokes.length > 0;
  const highlightSet = new Set(highlightedStrokes ?? []);

  return (
    <div
      className={cn(
        "relative rounded-[18px] border border-[var(--border)] bg-white",
        grid && "cali-grid",
        className
      )}
      style={{ width: size, height: size, padding: 12 }}
      aria-label={`Иероглиф: ${hanzi}`}
    >
      {data ? (
        <svg
          viewBox="0 0 1024 1024"
          width={size - 24}
          height={size - 24}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="matrix(1 0 0 -1 0 900)">
            {data.strokes.map((d, i) => {
              const on = hasHighlight ? highlightSet.has(i) : true;
              const fill = hasHighlight
                ? on
                  ? "var(--green-deep)"
                  : "rgba(42, 44, 40, 0.18)"
                : "var(--foreground)";
              return (
                <path
                  key={i}
                  d={d}
                  fill={fill}
                  stroke="none"
                  style={{
                    transition: "fill 220ms ease",
                  }}
                />
              );
            })}
          </g>
        </svg>
      ) : error ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--foreground-muted)]">
          {hanzi}
        </div>
      ) : (
        <div
          className="hanzi flex items-center justify-center w-full h-full text-[var(--foreground-soft)]"
          style={{ fontSize: size * 0.6 }}
        >
          {hanzi}
        </div>
      )}
    </div>
  );
}

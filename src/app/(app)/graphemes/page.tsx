"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ALL_CHARACTERS, getChar, meaningRu, type CharRecord } from "@/lib/characters";
import { Card } from "@/components/ui/Card";
import { Eraser, Search, Undo2, PenTool } from "lucide-react";
import { cn } from "@/lib/cn";

interface CharMatch {
  character: string;
  score: number;
}

const CANVAS_SIZE = 512;

export default function GraphemesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<number[][][]>([]);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<number[][]>([]);
  const [matches, setMatches] = useState<CharMatch[]>([]);
  const [selectedChar, setSelectedChar] = useState<CharRecord | null>(null);
  const [relatedChars, setRelatedChars] = useState<CharRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [textQuery, setTextQuery] = useState("");
  const [strokeCount, setStrokeCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matcherRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hlRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hl = await import("hanzilookup-js");
        hlRef.current = hl;
        hl.init("mmah", "/mmah.json", (success: boolean) => {
          if (cancelled) return;
          if (success) {
            matcherRef.current = new hl.Matcher("mmah");
            setReady(true);
          }
        });
      } catch (e) {
        console.error("Failed to load hanzilookup", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectCharFn = useCallback((hanzi: string) => {
    const c = getChar(hanzi);
    if (!c) return;
    setSelectedChar(c);
    const related = ALL_CHARACTERS.filter(
      (ch) => ch.hanzi !== hanzi && (ch.components?.includes(hanzi) || ch.radical === hanzi)
    ).slice(0, 30);
    setRelatedChars(related);
  }, []);

  const lookup = useCallback(() => {
    if (!matcherRef.current || !hlRef.current || strokesRef.current.length === 0) return;
    try {
      const analyzed = new hlRef.current.AnalyzedCharacter(strokesRef.current);
      matcherRef.current.match(analyzed, 12, (results: CharMatch[]) => {
        if (!results || results.length === 0) {
          setMatches([]);
          return;
        }
        const maxScore = results[0].score;
        const normalized = results
          .filter((r) => r.score > 0)
          .map((r) => ({
            character: r.character,
            score: maxScore > 0 ? Math.min(r.score / maxScore, 1) : 0,
          }));
        setMatches(normalized);
        if (normalized.length > 0) {
          const top = normalized[0].character;
          const c = getChar(top);
          if (c) selectCharFn(top);
        }
      });
    } catch {
      // ignore
    }
  }, [selectCharFn]);

  const searchByText = useCallback((q: string) => {
    setTextQuery(q);
    if (!q.trim()) {
      setSelectedChar(null);
      setRelatedChars([]);
      return;
    }
    const ch = getChar(q.trim());
    if (ch) {
      selectCharFn(q.trim());
      return;
    }
    const lower = q.toLowerCase();
    const found = ALL_CHARACTERS.filter(
      (c) =>
        c.hanzi.includes(q) ||
        c.radical === q ||
        c.components?.includes(q) ||
        c.pinyin?.toLowerCase().includes(lower) ||
        meaningRu(c)?.toLowerCase().includes(lower)
    ).slice(0, 20);
    if (found.length > 0) {
      selectCharFn(found[0].hanzi);
    }
  }, [selectCharFn]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1c18";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokesRef.current) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        const speed = i > 0
          ? Math.sqrt(
              Math.pow(stroke[i][0] - stroke[i - 1][0], 2) +
              Math.pow(stroke[i][1] - stroke[i - 1][1], 2)
            )
          : 0;
        ctx.lineWidth = Math.max(3, Math.min(8, 10 - speed * 0.3));
        ctx.lineTo(stroke[i][0], stroke[i][1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(stroke[i][0], stroke[i][1]);
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = () => canvas.getBoundingClientRect();
    const scale = () => canvas.width / rect().width;

    const getPos = (e: MouseEvent | Touch): [number, number] => {
      const r = rect();
      const s = scale();
      return [(e.clientX - r.left) * s, (e.clientY - r.top) * s];
    };

    const drawSegment = (from: number[], to: number[], speed: number) => {
      ctx.strokeStyle = "#1a1c18";
      ctx.lineWidth = Math.max(3, Math.min(8, 10 - speed * 0.3));
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.stroke();
    };

    const onDown = (e: MouseEvent) => {
      drawingRef.current = true;
      const [x, y] = getPos(e);
      currentStrokeRef.current = [[x, y]];
    };

    const onMove = (e: MouseEvent) => {
      if (!drawingRef.current) return;
      const [x, y] = getPos(e);
      const pts = currentStrokeRef.current;
      const prev = pts[pts.length - 1];
      pts.push([x, y]);
      const speed = Math.sqrt(
        Math.pow(x - prev[0], 2) + Math.pow(y - prev[1], 2)
      );
      drawSegment(prev, [x, y], speed);
    };

    const finishStroke = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      if (currentStrokeRef.current.length > 1) {
        strokesRef.current.push([...currentStrokeRef.current]);
        setStrokeCount(strokesRef.current.length);
        lookup();
      }
      currentStrokeRef.current = [];
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const [x, y] = getPos(e.touches[0]);
      drawingRef.current = true;
      currentStrokeRef.current = [[x, y]];
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!drawingRef.current) return;
      const [x, y] = getPos(e.touches[0]);
      const pts = currentStrokeRef.current;
      const prev = pts[pts.length - 1];
      pts.push([x, y]);
      const speed = Math.sqrt(
        Math.pow(x - prev[0], 2) + Math.pow(y - prev[1], 2)
      );
      drawSegment(prev, [x, y], speed);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      finishStroke();
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", finishStroke);
    canvas.addEventListener("mouseleave", finishStroke);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", finishStroke);
      canvas.removeEventListener("mouseleave", finishStroke);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [lookup]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
    setStrokeCount(0);
    setMatches([]);
    setSelectedChar(null);
    setRelatedChars([]);
  };

  const undoStroke = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    redrawCanvas();
    if (strokesRef.current.length > 0) {
      lookup();
    } else {
      setMatches([]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--green-soft)] flex items-center justify-center">
            <PenTool size={18} className="text-[var(--green)]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium">
            Поиск графем
          </h1>
        </div>
        <p className="text-sm text-[var(--foreground-muted)] mt-1.5 max-w-lg ml-[52px]">
          Нарисуйте иероглиф или введите текст для поиска
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-8">
        {/* Left: Drawing + search */}
        <div className="space-y-4">
          {/* Drawing canvas */}
          <div className="relative bg-white rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="w-full aspect-square cursor-crosshair"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)",
                backgroundSize: "25% 25%, 25% 25%, 50% 50%, 50% 50%",
                backgroundPosition: "center center",
              }}
            />
            {/* Canvas controls */}
            <div className="absolute top-3 right-3 flex gap-1.5">
              <button
                type="button"
                onClick={undoStroke}
                disabled={strokeCount === 0}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md transition-all",
                  strokeCount > 0
                    ? "bg-white/90 text-[var(--foreground)] shadow-md hover:shadow-lg active:scale-95"
                    : "bg-white/50 text-[var(--foreground-soft)] cursor-not-allowed"
                )}
                aria-label="Отменить черту"
              >
                <Undo2 size={18} />
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                disabled={strokeCount === 0}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md transition-all",
                  strokeCount > 0
                    ? "bg-white/90 text-[var(--foreground)] shadow-md hover:shadow-lg active:scale-95"
                    : "bg-white/50 text-[var(--foreground-soft)] cursor-not-allowed"
                )}
                aria-label="Очистить"
              >
                <Eraser size={18} />
              </button>
            </div>
            {/* Stroke counter */}
            {strokeCount > 0 && (
              <div className="absolute bottom-3 left-3 text-xs text-[var(--foreground-soft)] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                {strokeCount} {strokeCount === 1 ? "черта" : strokeCount < 5 ? "черты" : "черт"}
              </div>
            )}
            {strokeCount === 0 && ready && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] flex items-center justify-center">
                    <PenTool size={20} className="text-[var(--foreground-soft)]" />
                  </div>
                  <span className="text-[var(--foreground-soft)] text-sm select-none">
                    Рисуйте здесь
                  </span>
                </div>
              </div>
            )}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] bg-white/80 px-4 py-2 rounded-xl">
                  <span className="inline-block w-4 h-4 border-2 border-[var(--green)]/30 border-t-[var(--green)] rounded-full animate-spin" />
                  Загрузка...
                </div>
              </div>
            )}
          </div>

          {/* Text search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-soft)]" />
            <input
              type="text"
              value={textQuery}
              onChange={(e) => searchByText(e.target.value)}
              placeholder="Поиск по пиньинь, русскому или иероглифу..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20 focus:border-[var(--green)] transition-shadow"
            />
          </div>

          {/* Recognition results */}
          {matches.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2 px-1">
                Найдено ({matches.length})
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {matches.map((m) => {
                  const c = getChar(m.character);
                  const active = selectedChar?.hanzi === m.character;
                  return (
                    <button
                      key={m.character}
                      type="button"
                      onClick={() => selectCharFn(m.character)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 py-3 px-1 rounded-xl border transition-all",
                        active
                          ? "border-[var(--green)] bg-[var(--green-soft)] shadow-sm"
                          : "border-[var(--border)] bg-white hover:shadow-sm hover:border-[var(--green)]/40"
                      )}
                    >
                      <span className="hanzi text-2xl leading-none">{m.character}</span>
                      {c && (
                        <span className="text-[10px] text-[var(--foreground-muted)] truncate max-w-full px-1">
                          {meaningRu(c) ? meaningRu(c)!.slice(0, 10) : c.pinyin}
                        </span>
                      )}
                      <span className="text-[9px] text-[var(--foreground-soft)]">
                        {Math.round(m.score * 100)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Character details */}
        <div>
          {selectedChar ? (
            <div className="space-y-5 float-up">
              {/* Main character card */}
              <Card className="p-6 sm:p-8">
                <div className="flex items-start gap-5">
                  <div className="flex flex-col items-center">
                    <span className="hanzi text-8xl sm:text-[7rem] leading-none">{selectedChar.hanzi}</span>
                    <span className="pinyin text-lg text-[var(--foreground-muted)] mt-2">
                      {selectedChar.pinyin || "—"}
                    </span>
                  </div>
                  <div className="flex-1 pt-2">
                    <div className="text-xl sm:text-2xl font-medium leading-snug">
                      {meaningRu(selectedChar) || selectedChar.meaningPrimary || "—"}
                    </div>
                    {selectedChar.meaningsEn?.[0] && (
                      <div className="text-sm text-[var(--foreground-muted)] mt-1">
                        {selectedChar.meaningsEn[0]}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--green-soft)] text-xs text-[var(--green)] font-medium">
                        HSK {selectedChar.level || "—"}
                      </span>
                      {selectedChar.radical && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--surface-2)] text-xs text-[var(--foreground-muted)]">
                          Ключ: {selectedChar.radical}
                        </span>
                      )}
                      {selectedChar.hasStrokes && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--surface-2)] text-xs text-[var(--foreground-muted)]">
                          Есть порядок черт
                        </span>
                      )}
                    </div>
                    {selectedChar.etymology && (
                      <p className="text-sm text-[var(--foreground-muted)] mt-3 leading-relaxed italic">
                        {selectedChar.etymology}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Components */}
              {selectedChar.components && selectedChar.components.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-3 px-1">
                    Составные графемы
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedChar.components.map((comp, i) => {
                      const compChar = getChar(comp);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectCharFn(comp)}
                          className="card-soft px-4 py-3 flex items-center gap-3 hover:shadow-md transition-all rounded-xl active:scale-95"
                        >
                          <span className="hanzi text-3xl">{comp}</span>
                          <div className="text-left">
                            {compChar && (
                              <>
                                <div className="text-xs text-[var(--foreground-muted)]">
                                  {compChar.pinyin}
                                </div>
                                <div className="text-sm font-medium">
                                  {meaningRu(compChar) || compChar.meaningPrimary || "—"}
                                </div>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Related characters */}
              {relatedChars.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-3 px-1">
                    Иероглифы с этой графемой ({relatedChars.length})
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {relatedChars.map((c) => (
                      <button
                        key={c.hanzi}
                        type="button"
                        onClick={() => selectCharFn(c.hanzi)}
                        className="card-soft px-2 py-3 flex flex-col items-center gap-1 hover:shadow-md transition-all rounded-xl active:scale-95"
                      >
                        <span className="hanzi text-2xl">{c.hanzi}</span>
                        <span className="pinyin text-[10px] text-[var(--foreground-muted)]">
                          {c.pinyin}
                        </span>
                        <span className="text-[10px] text-[var(--foreground-muted)] truncate max-w-full px-1">
                          {meaningRu(c) || "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="w-20 h-20 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-4">
                <Search size={28} className="text-[var(--foreground-soft)]" />
              </div>
              <div className="text-lg font-medium text-[var(--foreground-muted)] mb-1">
                Начните рисовать
              </div>
              <div className="text-sm text-[var(--foreground-soft)] max-w-xs">
                Нарисуйте графему или иероглиф на холсте, и мы найдём её значение и связанные иероглифы
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

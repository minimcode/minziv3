"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import {
  ALL_CHARACTERS,
  getChar,
  meaningRu,
  displayMeaning,
  displayMeaningOf,
  displayMeaningFull,
  componentLabelFor,
  pinyinOf,
  type CharRecord,
} from "@/lib/characters";
import { confusionGroupFor } from "@/lib/confusion";
import { Card } from "@/components/ui/Card";
import { Eraser, Search, Undo2, PenTool, X } from "lucide-react";
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
  /* Mobile detail panel — on small screens we don't want a long inline
     scroll after the canvas; tapping a card opens a bottom sheet
     instead. Desktop ignores this flag entirely. */
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
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
    if (c) {
      setSelectedChar(c);
    } else {
      // Character is outside the HSK 3.0 dataset (the MMAH stroke index
      // covers many more characters than we have records for). Show a
      // minimal record so the detail pane still opens — the optional
      // fields just collapse.
      setSelectedChar({
        hanzi,
        pinyin: "",
        level: 0,
        freq: 0,
        // Honest component label instead of the generic placeholder.
        meaningPrimary: componentLabelFor(hanzi),
        meaningsRu: [],
        meaningsEn: [],
        hasStrokes: false,
      });
    }
    const related = ALL_CHARACTERS.filter(
      (ch) => ch.hanzi !== hanzi && (ch.components?.includes(hanzi) || ch.radical === hanzi)
    ).slice(0, 30);
    setRelatedChars(related);
    setMobileSheetOpen(true);
  }, []);

  /* Lock body scroll & close the sheet with Esc while the mobile sheet
     is open — same behaviour as the dictionary detail sheet. */
  useEffect(() => {
    if (!mobileSheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileSheetOpen]);

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
        // Intentionally do NOT auto-open the detail sheet here. We only
        // surface candidate cards — the user picks one with a tap.
      });
    } catch {
      // ignore
    }
  }, []);

  const searchByText = useCallback((q: string) => {
    setTextQuery(q);
    if (!q.trim()) {
      setSelectedChar(null);
      setRelatedChars([]);
      setMatches([]);
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
    // Surface matches as result cards but don't auto-open the sheet —
    // the user explicitly taps a card. Score `1` is purely a visual
    // placeholder; the cards don't show a percentage when score == 1.
    setMatches(found.map((c) => ({ character: c.hanzi, score: 1 })));
  }, []);

  /* Reads the current ink colour from CSS — swaps between near-black
     in light theme and cream in dark theme without re-renders. Falls
     back to dark ink for the very first paint before tokens resolve. */
  const inkColor = () => {
    if (typeof window === "undefined") return "#1a1c18";
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--ink")
      .trim();
    return v || "#1a1c18";
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = inkColor();
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
      ctx.strokeStyle = inkColor();
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
          <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center">
            <PenTool size={18} className="text-[var(--foreground-muted)]" />
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

          {/* Recognition results.
              Every card uses the same fixed slots (hanzi · pinyin · meaning ·
              similarity %) so heights and baselines stay consistent, even
              when the matched character is outside the HSK dataset and the
              record is missing. The pinyin / meaning rows fall through to
              `pinyinOf` / `bestMeaningOf`, which always return a string —
              never an empty line. The matching radical / component is gently
              highlighted in jade. */}
          {matches.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2 px-1">
                Найдено ({matches.length})
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {matches.map((m) => {
                  const c = getChar(m.character);
                  const active = selectedChar?.hanzi === m.character;
                  const pinyin = pinyinOf(m.character);
                  const meaning = displayMeaningOf(m.character);
                  const similarity = Math.round(m.score * 100);
                  const sharesRadical = !!(
                    selectedChar &&
                    c &&
                    ((selectedChar.radical && selectedChar.radical === c.radical) ||
                      (c.components &&
                        selectedChar.components &&
                        c.components.some((x) =>
                          selectedChar.components!.includes(x)
                        )))
                  );
                  return (
                    <button
                      key={m.character}
                      type="button"
                      onClick={() => selectCharFn(m.character)}
                      title={
                        c
                          ? `${m.character} · ${pinyin || "—"} · HSK ${c.level}\nЧерт: ${
                              c.strokeToComponent?.length ?? "?"
                            } · сходство ${similarity}%${
                              sharesRadical && c.radical
                                ? `\nОбщий ключ ${c.radical}`
                                : ""
                            }`
                          : `${m.character} · сходство ${similarity}%`
                      }
                      className={cn(
                        "flex flex-col items-stretch gap-0.5 pt-2.5 pb-2 px-1.5 rounded-xl border transition-all min-h-[96px] text-center group",
                        active
                          ? "border-[var(--green)] bg-[var(--green-soft)] shadow-sm"
                          : sharesRadical
                          ? "border-[var(--green)]/45 bg-[var(--green-soft)]/45 hover:shadow-sm"
                          : "border-[var(--border)] bg-white hover:shadow-sm hover:border-[var(--green)]/40"
                      )}
                    >
                      <span
                        className={cn(
                          "hanzi text-2xl leading-none",
                          active && "text-[var(--green-ink)]"
                        )}
                      >
                        {m.character}
                      </span>
                      <span className="pinyin text-[10px] text-[var(--foreground-muted)] truncate px-1">
                        {pinyin || "—"}
                      </span>
                      <span className="text-[10px] text-[var(--foreground-muted)] truncate px-1">
                        {meaning}
                      </span>
                      <span className="text-[9px] text-[var(--foreground-soft)] tabular-nums mt-auto">
                        {similarity}%{c ? ` · HSK ${c.level}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Character details.
            Hidden on small screens — on mobile, tapping a match opens a
            bottom sheet (rendered below the grid) instead of pushing a
            long detail block under the canvas. */}
        <div className="hidden lg:block">
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
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-0.5">
                      Значение иероглифа
                    </div>
                    <div className="text-xl sm:text-2xl font-medium leading-snug">
                      {displayMeaningFull(selectedChar)}
                    </div>
                    {meaningRu(selectedChar) && selectedChar.meaningsEn?.[0] && (
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
                      const compPinyin = pinyinOf(comp);
                      const compMeaning = compChar
                        ? displayMeaning(compChar)
                        : componentLabelFor(comp);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectCharFn(comp)}
                          className="card-soft px-4 py-3 flex items-center gap-3 hover:shadow-md transition-all rounded-xl active:scale-95 min-h-[68px]"
                        >
                          <span className="hanzi text-3xl leading-none">{comp}</span>
                          <div className="text-left min-w-[110px]">
                            <div className="pinyin text-xs text-[var(--foreground-muted)]">
                              {compPinyin || "—"}
                            </div>
                            <div className="text-sm font-medium leading-tight">
                              {compMeaning}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Confusion panel — «ne putayte». Shows visually similar
                  characters from the curated confusion list so the user
                  knows what to compare with. */}
              {(() => {
                const group = confusionGroupFor(selectedChar.hanzi);
                if (!group || group.length < 2) return null;
                return (
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-3 px-1">
                      Не путайте — похожие иероглифы
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.map((h) => {
                        const cc = getChar(h);
                        const isSelf = h === selectedChar.hanzi;
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => !isSelf && selectCharFn(h)}
                            disabled={isSelf}
                            className={cn(
                              "card-soft px-3.5 py-2.5 flex items-center gap-3 transition-all rounded-xl",
                              isSelf
                                ? "opacity-100 ring-1 ring-[var(--green)]/40 bg-[var(--green-soft)]/40 cursor-default"
                                : "hover:shadow-md active:scale-95"
                            )}
                          >
                            <span className="hanzi text-2xl">{h}</span>
                            <div className="text-left text-xs">
                              <div className="text-[var(--foreground-muted)]">
                                {cc?.pinyin || pinyinOf(h) || "—"}
                              </div>
                              <div className="font-medium leading-tight">
                                {displayMeaningOf(h)}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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
                        className="card-soft px-2 pt-2.5 pb-2 flex flex-col items-center gap-0.5 hover:shadow-md transition-all rounded-xl active:scale-95 min-h-[88px] text-center"
                      >
                        <span className="hanzi text-2xl leading-none">{c.hanzi}</span>
                        <span className="pinyin text-[10px] text-[var(--foreground-muted)] truncate max-w-full px-1">
                          {c.pinyin || "—"}
                        </span>
                        <span className="text-[10px] text-[var(--foreground-muted)] truncate max-w-full px-1">
                          {displayMeaning(c)}
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

      {/* Mobile detail sheet.
          Renders only on small viewports (`lg:hidden`). The detail panel
          slides up from the bottom with a soft backdrop blur; the grab
          handle can be dragged down to dismiss, mirroring the dictionary
          detail sheet. We keep the desktop layout untouched. */}
      {mobileSheetOpen && selectedChar && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setMobileSheetOpen(false)}
          />
          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Детали: ${selectedChar.hanzi}`}
            className="relative w-full h-[90dvh] bg-[var(--surface)] rounded-t-3xl shadow-2xl border-t border-[var(--border)] overflow-hidden flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_e: unknown, info: PanInfo) => {
              if (info.offset.y > 120 || info.velocity.y > 600) {
                setMobileSheetOpen(false);
              }
            }}
          >
            {/* Grab handle */}
            <div className="pt-2.5 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing select-none">
              <span className="block w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>
            {/* Close button */}
            <button
              type="button"
              aria-label="Закрыть"
              onClick={() => setMobileSheetOpen(false)}
              className="absolute top-2 right-3 w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--surface-2)] text-[var(--foreground-muted)] hover:bg-[var(--surface-3)] active:scale-95 transition-all"
            >
              <X size={18} />
            </button>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-1">
              <div className="space-y-4">
                {/* Main character card */}
                <Card className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <span className="hanzi text-7xl leading-none">{selectedChar.hanzi}</span>
                      <span className="pinyin text-base text-[var(--foreground-muted)] mt-1.5">
                        {selectedChar.pinyin || "—"}
                      </span>
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-0.5">
                        Значение
                      </div>
                      <div className="text-lg font-medium leading-snug">
                        {displayMeaningFull(selectedChar)}
                      </div>
                      {meaningRu(selectedChar) && selectedChar.meaningsEn?.[0] && (
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
                      </div>
                      {selectedChar.etymology && (
                        <p className="text-sm text-[var(--foreground-muted)] mt-3 leading-relaxed italic">
                          {selectedChar.etymology}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                {selectedChar.components && selectedChar.components.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2 px-1">
                      Составные графемы
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedChar.components.map((comp, i) => {
                        const compChar = getChar(comp);
                        const compPinyin = pinyinOf(comp);
                        const compMeaning = compChar
                          ? displayMeaning(compChar)
                          : componentLabelFor(comp);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => selectCharFn(comp)}
                            className="card-soft px-3 py-2 flex items-center gap-2.5 hover:shadow-md transition-all rounded-xl active:scale-95"
                          >
                            <span className="hanzi text-2xl leading-none">{comp}</span>
                            <div className="text-left min-w-[90px]">
                              <div className="pinyin text-[11px] text-[var(--foreground-muted)]">
                                {compPinyin || "—"}
                              </div>
                              <div className="text-xs font-medium leading-tight">
                                {compMeaning}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(() => {
                  const group = confusionGroupFor(selectedChar.hanzi);
                  if (!group || group.length < 2) return null;
                  return (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2 px-1">
                        Не путайте
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.map((h) => {
                          const cc = getChar(h);
                          const isSelf = h === selectedChar.hanzi;
                          return (
                            <button
                              key={h}
                              type="button"
                              onClick={() => !isSelf && selectCharFn(h)}
                              disabled={isSelf}
                              className={cn(
                                "card-soft px-3 py-2 flex items-center gap-2.5 transition-all rounded-xl",
                                isSelf
                                  ? "opacity-100 ring-1 ring-[var(--green)]/40 bg-[var(--green-soft)]/40 cursor-default"
                                  : "hover:shadow-md active:scale-95"
                              )}
                            >
                              <span className="hanzi text-xl">{h}</span>
                              <div className="text-left text-xs">
                                <div className="text-[var(--foreground-muted)]">
                                  {cc?.pinyin || pinyinOf(h) || "—"}
                                </div>
                                <div className="font-medium leading-tight">
                                  {displayMeaningOf(h)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {relatedChars.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2 px-1">
                      Иероглифы с этой графемой ({relatedChars.length})
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {relatedChars.map((c) => (
                        <button
                          key={c.hanzi}
                          type="button"
                          onClick={() => selectCharFn(c.hanzi)}
                          className="card-soft px-2 pt-2 pb-2 flex flex-col items-center gap-0.5 hover:shadow-md transition-all rounded-xl active:scale-95 min-h-[80px] text-center"
                        >
                          <span className="hanzi text-2xl leading-none">{c.hanzi}</span>
                          <span className="pinyin text-[10px] text-[var(--foreground-muted)] truncate max-w-full px-1">
                            {c.pinyin || "—"}
                          </span>
                          <span className="text-[10px] text-[var(--foreground-muted)] truncate max-w-full px-1">
                            {displayMeaning(c)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

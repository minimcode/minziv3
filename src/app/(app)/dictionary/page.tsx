"use client";

import { useMemo, useState } from "react";
import {
  ALL_CHARACTERS,
  meaningRu,
  meaningShort,
  type CharRecord,
} from "@/lib/characters";
import { useProgress } from "@/store/progress";
import { Card } from "@/components/ui/Card";
import { Star, Search, Volume2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { StrokeAnimation } from "@/components/learn/StrokeAnimation";
import { HanziStrokes } from "@/components/learn/HanziStrokes";
import { Graphemes } from "@/components/learn/Graphemes";

const LEVELS = [
  { key: "all", label: "Все" },
  { key: "fav", label: "Избранное" },
  { key: "1", label: "HSK 1", level: 1 },
  { key: "2", label: "HSK 2", level: 2 },
  { key: "3", label: "HSK 3", level: 3 },
  { key: "4", label: "HSK 4", level: 4 },
  { key: "5", label: "HSK 5", level: 5 },
  { key: "6", label: "HSK 6", level: 6 },
  { key: "7-9", label: "HSK 7-9", level: 7 },
];

export default function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [picked, setPicked] = useState<CharRecord | null>(null);
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
  const [selectedGrapheme, setSelectedGrapheme] = useState<number | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);

  const charsState = useProgress((s) => s.chars);
  const toggleFav = useProgress((s) => s.toggleFavorite);

  const list = useMemo(() => {
    let xs = ALL_CHARACTERS;
    const f = LEVELS.find((x) => x.key === filter);
    if (f?.level === 7) {
      xs = xs.filter((c) => c.level >= 7);
    } else if (f?.level) {
      xs = xs.filter((c) => c.level === f.level);
    }
    if (filter === "fav") {
      xs = xs.filter((c) => charsState[c.hanzi]?.favorite);
    }
    if (query) {
      const q = query.toLowerCase();
      xs = xs.filter(
        (c) =>
          c.hanzi.includes(q) ||
          c.pinyin.toLowerCase().includes(q) ||
          meaningRu(c).toLowerCase().includes(q) ||
          c.meaningsEn.some((m) => m.toLowerCase().includes(q))
      );
    }
    return xs.slice(0, 500);
  }, [query, filter, charsState]);

  const totalCount = useMemo(() => {
    const f = LEVELS.find((x) => x.key === filter);
    if (f?.level === 7) return ALL_CHARACTERS.filter((c) => c.level >= 7).length;
    if (f?.level) return ALL_CHARACTERS.filter((c) => c.level === f.level).length;
    if (filter === "fav") return ALL_CHARACTERS.filter((c) => charsState[c.hanzi]?.favorite).length;
    return ALL_CHARACTERS.length;
  }, [filter, charsState]);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const openChar = (c: CharRecord) => {
    setPicked(c);
    setShowStrokeOrder(false);
    setSelectedGrapheme(null);
    setMobileDetail(true);
  };

  const charDetail = picked ? (() => {
    const stc = picked.strokeToComponent ?? null;
    const highlighted =
      selectedGrapheme !== null && stc
        ? stc.map((v, i) => (v === selectedGrapheme ? i : -1)).filter((i) => i >= 0)
        : null;
    return (
      <div className="flex flex-col items-center text-center gap-5">
        {/* Close button on mobile */}
        <button
          type="button"
          onClick={() => setMobileDetail(false)}
          className="lg:hidden absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="inline-flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--foreground-soft)]">
            HSK {picked.level}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFav(picked.hanzi);
            }}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              charsState[picked.hanzi]?.favorite
                ? "text-[var(--red)] bg-red-50"
                : "text-[var(--foreground-soft)] hover:bg-[var(--surface-2)]"
            )}
            aria-label="В избранное"
          >
            <Star size={16} fill={charsState[picked.hanzi]?.favorite ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Character display */}
        <div className="relative">
          {showStrokeOrder ? (
            <StrokeAnimation
              key={`anim-${picked.hanzi}`}
              hanzi={picked.hanzi}
              size={240}
              autoplay
            />
          ) : (
            <HanziStrokes
              key={`static-${picked.hanzi}`}
              hanzi={picked.hanzi}
              size={240}
              highlightedStrokes={highlighted}
            />
          )}
          <button
            onClick={() => speak(picked.hanzi)}
            className="absolute top-2 right-2 w-9 h-9 rounded-xl bg-white/90 backdrop-blur-sm border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:shadow-md transition-all flex items-center justify-center"
            aria-label="Произнести"
          >
            <Volume2 size={15} />
          </button>
        </div>

        {/* Stroke order toggle */}
        <button
          type="button"
          onClick={() => setShowStrokeOrder(!showStrokeOrder)}
          className={cn(
            "h-9 px-4 rounded-xl text-xs font-medium transition-all border",
            showStrokeOrder
              ? "bg-[var(--green-soft)] border-[var(--green)] text-[var(--green-deep)]"
              : "bg-white border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--green)]/40 hover:shadow-sm"
          )}
        >
          {showStrokeOrder ? "Скрыть анимацию" : "Порядок черт"}
        </button>

        {/* Pinyin + meaning */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="pinyin text-xl text-[var(--foreground-muted)]">
            {picked.pinyin}
          </div>
          <div className="text-lg font-medium leading-snug max-w-xs break-words">
            {meaningRu(picked) || picked.meaningPrimary || "—"}
          </div>
          {picked.meaningsEn?.[0] && (
            <div className="text-sm text-[var(--foreground-soft)]">
              {picked.meaningsEn[0]}
            </div>
          )}
        </div>

        {/* Etymology */}
        {picked.etymology && (
          <p className="text-xs text-[var(--foreground-muted)] italic leading-relaxed max-w-xs">
            {picked.etymology}
          </p>
        )}

        {/* Components */}
        {(picked.components?.length ?? 0) > 0 && (
          <Graphemes
            char={picked}
            selectedIndex={selectedGrapheme}
            onSelect={(i) => {
              setSelectedGrapheme(i);
              if (i !== null) setShowStrokeOrder(false);
            }}
          />
        )}
      </div>
    );
  })() : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-medium">
          Словарь
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">
          {totalCount.toLocaleString()} иероглифов · HSK 1-7
        </p>
      </header>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-soft)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по иероглифу, пиньиню или переводу..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20 focus:border-[var(--green)] transition-shadow"
        />
      </div>

      {/* Level filters */}
      <div className="flex gap-1.5 overflow-x-auto scroll-hide mb-5 pb-0.5">
        {LEVELS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              filter === f.key
                ? "bg-[var(--foreground)] text-white border-[var(--foreground)] shadow-sm"
                : "bg-white text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--foreground-soft)] hover:shadow-sm"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Character list */}
        <div>
          {list.length === 0 ? (
            <div className="text-sm text-[var(--foreground-muted)] py-12 text-center">
              <Search size={24} className="mx-auto mb-2 text-[var(--foreground-soft)]" />
              Ничего не найдено
            </div>
          ) : (
            <div className="space-y-1.5">
              {list.map((c) => {
                const fav = charsState[c.hanzi]?.favorite;
                const active = picked?.hanzi === c.hanzi;
                return (
                  <button
                    key={c.hanzi}
                    onClick={() => openChar(c)}
                    className={cn(
                      "w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-left transition-all",
                      active
                        ? "border-[var(--green)] bg-[var(--green-soft)] shadow-sm"
                        : "border-transparent bg-white hover:bg-[var(--surface)] hover:shadow-sm"
                    )}
                  >
                    <span className="hanzi text-3xl sm:text-4xl shrink-0 w-12 text-center">{c.hanzi}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="pinyin text-sm text-[var(--foreground-muted)]">
                          {c.pinyin || "—"}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-soft)]">
                          HSK {c.level}
                        </span>
                      </div>
                      <div className="text-sm truncate mt-0.5">
                        {meaningShort(c) || (
                          <span className="text-[var(--foreground-soft)] italic text-xs">
                            нет перевода
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(c.hanzi);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleFav(c.hanzi);
                        }
                      }}
                      className={cn(
                        "p-1.5 rounded-full transition-colors shrink-0",
                        fav
                          ? "text-[var(--red)]"
                          : "text-[var(--foreground-soft)] hover:bg-[var(--surface-2)]"
                      )}
                      aria-label="В избранное"
                    >
                      <Star size={16} fill={fav ? "currentColor" : "none"} />
                    </span>
                  </button>
                );
              })}
              {list.length >= 500 && (
                <div className="text-center py-4 text-xs text-[var(--foreground-soft)]">
                  Показано 500 из {totalCount} · уточните поиск
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop detail panel */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <Card className="p-6 sm:p-8 relative">
              {charDetail ?? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-3">
                    <Search size={24} className="text-[var(--foreground-soft)]" />
                  </div>
                  <div className="text-sm text-[var(--foreground-muted)]">
                    Выберите иероглиф, чтобы увидеть порядок черт и детали
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile detail sheet */}
      {picked && mobileDetail && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileDetail(false)}
          />
          <div className="relative w-full max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl p-6 pt-8 pb-10 float-up">
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-4 -mt-2" />
            {charDetail}
          </div>
        </div>
      )}
    </div>
  );
}

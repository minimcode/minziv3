"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ALL_CHARACTERS,
  meaningRu,
  bestMeaning,
  bestMeaningFull,
  displayMeaningOf,
  pinyinOf,
  type CharRecord,
} from "@/lib/characters";
import {
  loadWords,
  searchWords,
  stripPinyinTones,
  wordMeaningShort,
  wordMeaningFullRu,
  wordMeaningFullEn,
  type WordRecord,
} from "@/lib/words";
import { useProgress } from "@/store/progress";
import { Card } from "@/components/ui/Card";
import { Star, Search, Volume2, X, FolderPlus, BookText, BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { StrokeAnimation } from "@/components/learn/StrokeAnimation";
import { HanziStrokes } from "@/components/learn/HanziStrokes";
import { Graphemes } from "@/components/learn/Graphemes";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";

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

type KindFilter = "all" | "hanzi" | "word";
const KIND_FILTERS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "hanzi", label: "Иероглифы" },
  { key: "word", label: "Слова" },
];

/**
 * Discriminated row used by the unified list. Keeps the two datasets
 * apart at the model level so the renderer can pick the right visual
 * style (calmer pinyin-on-top layout for words, hanzi-centric layout
 * for characters) without overloading shared fields.
 */
type DictRow =
  | { kind: "hanzi"; rec: CharRecord }
  | { kind: "word"; rec: WordRecord };

type PickedItem =
  | { kind: "hanzi"; rec: CharRecord }
  | { kind: "word"; rec: WordRecord };

export default function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [picked, setPicked] = useState<PickedItem | null>(null);
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
  const [selectedGrapheme, setSelectedGrapheme] = useState<number | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [addToCollectionFor, setAddToCollectionFor] = useState<string[] | null>(null);
  /* Words live in a separate ~1.6 MB JSON chunk that we load lazily so
     the dictionary first paint isn't blocked on parsing them on mobile
     Safari. While `null` the words list is simply absent from results. */
  const [words, setWords] = useState<WordRecord[] | null>(null);

  const charsState = useProgress((s) => s.chars);
  const toggleFav = useProgress((s) => s.toggleFavorite);

  /* Lazy-load words on mount. Single fetch per session — `loadWords`
     caches the parsed array on the module. */
  useEffect(() => {
    let cancelled = false;
    loadWords().then((arr) => {
      if (!cancelled) setWords(arr);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ─── Hanzi list (filtered) ───────────────────────────────────── */
  const hanziList = useMemo(() => {
    if (kind === "word") return [];
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
      /* Mirror the scoring approach in `searchWords` so a short query
         like "hi" can no longer surface every gloss that contains "hi"
         as a substring. Categories are exact > prefix > word-boundary
         > infix, with hanzi/pinyin always ranked above meaning hits. */
      const q = query.trim();
      const qLower = q.toLowerCase();
      const qPinyin = stripPinyinTones(q);
      const isCjk = /[\u3400-\u9fff]/.test(q);
      const isAlpha = !isCjk && /^[\p{L}]+$/u.test(q);
      const isCyr = !isCjk && /[\p{Script=Cyrillic}]/u.test(q);
      const isShort = q.length <= 3;
      const tokenize = (s: string): string[] =>
        s
          ? s
              .toLowerCase()
              .replace(/\[[^\]]*\]/g, " ")
              .split(/[^\p{L}\p{N}]+/u)
              .filter(Boolean)
          : [];

      const scored = xs
        .map((c) => {
          let score = 0;
          if (isCjk) {
            if (c.hanzi === q) score += 1100;
            else if (c.hanzi.includes(q)) score += 600;
          }
          if (isAlpha) {
            const py = stripPinyinTones(c.pinyin);
            if (py === qPinyin) score += 1000;
            else if (py.startsWith(qPinyin)) score += 600;
            else if (py.includes(qPinyin) && qPinyin.length >= 3) score += 150;

            const tokensEn = c.meaningsEn.flatMap(tokenize);
            let mScore = 0;
            for (const t of tokensEn) {
              if (t === qLower) {
                mScore = Math.max(mScore, 800);
                break;
              } else if (t.startsWith(qLower) && qLower.length >= 3) {
                mScore = Math.max(mScore, 350);
              }
            }
            score += mScore;
            if (!isShort && qLower.length >= 4) {
              const enLower = c.meaningsEn.join(" | ").toLowerCase();
              if (enLower.includes(qLower) && !tokensEn.some((t) => t === qLower)) {
                score += 90;
              }
            }
          }
          if (isCyr) {
            const ruRaw = meaningRu(c) || "";
            const ruTokens = tokenize(ruRaw);
            for (const t of ruTokens) {
              if (t === qLower) {
                score += 850;
                break;
              } else if (t.startsWith(qLower) && qLower.length >= 2) {
                score = Math.max(score, score) + 400;
                break;
              }
            }
            if (qLower.length >= 3 && ruRaw.toLowerCase().includes(qLower)) {
              score += 60;
            }
          }
          return { c, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.c.level !== b.c.level) return a.c.level - b.c.level;
          return 0;
        });
      xs = scored.map((s) => s.c);
    }
    return xs;
  }, [query, filter, kind, charsState]);

  /* ─── Word list (filtered) ────────────────────────────────────── */
  const wordList = useMemo<WordRecord[]>(() => {
    if (kind === "hanzi" || !words) return [];
    // Favorites filter doesn't apply to words yet (word SRS isn't
    // wired). Show empty in that combo so the UI stays honest.
    if (filter === "fav") return [];
    let xs = words;
    const f = LEVELS.find((x) => x.key === filter);
    if (f?.level === 7) xs = xs.filter((w) => w.level >= 7);
    else if (f?.level) xs = xs.filter((w) => w.level === f.level);
    if (query) {
      xs = searchWords(xs, query, 1000);
    }
    return xs;
  }, [words, query, filter, kind]);

  /* Unified row stream. In "Все" mode we interleave by putting hanzi
     matches first (they're typically what users want when typing a
     single CJK char), then words. */
  const list = useMemo<DictRow[]>(() => {
    const rows: DictRow[] = [];
    for (const c of hanziList) rows.push({ kind: "hanzi", rec: c });
    for (const w of wordList) rows.push({ kind: "word", rec: w });
    return rows.slice(0, 500);
  }, [hanziList, wordList]);

  const totalCount = useMemo(() => {
    const hCount = hanziList.length;
    const wCount = wordList.length;
    if (kind === "hanzi") return hCount;
    if (kind === "word") return wCount;
    return hCount + wCount;
  }, [hanziList, wordList, kind]);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const openChar = (c: CharRecord) => {
    setPicked({ kind: "hanzi", rec: c });
    setShowStrokeOrder(false);
    setSelectedGrapheme(null);
    setMobileDetail(true);
  };

  const openWord = (w: WordRecord) => {
    setPicked({ kind: "word", rec: w });
    setShowStrokeOrder(false);
    setSelectedGrapheme(null);
    setMobileDetail(true);
  };

  /* Allow drilling from a word's char-breakdown back into the full
     hanzi card without losing the search context. */
  const openHanziByValue = (hanzi: string) => {
    const c = ALL_CHARACTERS.find((x) => x.hanzi === hanzi);
    if (c) openChar(c);
  };

  /* While the mobile detail modal is open, lock body scroll so the
     background page doesn't scroll behind it, and close on Escape. */
  useEffect(() => {
    if (!mobileDetail) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDetail(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileDetail]);

  /* ─── Character detail (unchanged layout) ─────────────────────── */
  const charDetail = picked?.kind === "hanzi" ? (() => {
    const char = picked.rec;
    const stc = char.strokeToComponent ?? null;
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
            HSK {char.level}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFav(char.hanzi);
            }}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              charsState[char.hanzi]?.favorite
                ? "text-[var(--red)] bg-red-50"
                : "text-[var(--foreground-soft)] hover:bg-[var(--surface-2)]"
            )}
            aria-label="В избранное"
          >
            <Star size={16} fill={charsState[char.hanzi]?.favorite ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAddToCollectionFor([char.hanzi]);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--foreground-soft)] hover:text-[var(--green)] hover:bg-[var(--green-soft)] transition-colors"
            aria-label="Добавить в коллекцию"
            title="Добавить в коллекцию"
          >
            <FolderPlus size={16} />
          </button>
        </div>

        {/* Character display */}
        <div className="relative">
          {showStrokeOrder ? (
            <StrokeAnimation
              key={`anim-${char.hanzi}`}
              hanzi={char.hanzi}
              size={240}
              autoplay
            />
          ) : (
            <HanziStrokes
              key={`static-${char.hanzi}`}
              hanzi={char.hanzi}
              size={240}
              highlightedStrokes={highlighted}
            />
          )}
          <button
            onClick={() => speak(char.hanzi)}
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
            {char.pinyin || "—"}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mt-1">
            Значение иероглифа
          </div>
          <div className="text-lg font-medium leading-snug max-w-xs break-words">
            {bestMeaningFull(char)}
          </div>
          {meaningRu(char) && char.meaningsEn?.[0] && (
            <div className="text-sm text-[var(--foreground-soft)]">
              {char.meaningsEn[0]}
            </div>
          )}
        </div>

        {/* Etymology */}
        {char.etymology && (
          <p className="text-xs text-[var(--foreground-muted)] italic leading-relaxed max-w-xs">
            {char.etymology}
          </p>
        )}

        {/* Components */}
        {(char.components?.length ?? 0) > 0 && (
          <Graphemes
            char={char}
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

  /* ─── Word detail (new, language-feel layout) ─────────────────── */
  const wordDetail = picked?.kind === "word" ? (() => {
    const w = picked.rec;
    const chars = Array.from(w.word);
    return (
      <div className="flex flex-col items-center text-center gap-5">
        {/* Close on mobile */}
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
            HSK {w.level === 7 ? "7-9" : w.level} · слово
          </span>
          <button
            type="button"
            onClick={() => speak(w.word)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--foreground-soft)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Произнести"
          >
            <Volume2 size={15} />
          </button>
        </div>

        {/* Word + pinyin block — calmer typography than the hanzi
            display: pinyin lives above the chars on its own line, with
            a slim divider so the word reads as one lexeme. */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="pinyin text-base text-[var(--foreground-muted)]">
            {w.pinyin || "—"}
          </div>
          <div className="hanzi text-5xl sm:text-6xl leading-none tracking-wide">
            {w.word}
          </div>
          {w.traditional && w.traditional !== w.word && (
            <div className="hanzi text-base text-[var(--foreground-soft)] mt-1">
              繁: {w.traditional}
            </div>
          )}
        </div>

        {/* Russian meanings (БКРС) come first; English glosses
            (CC-CEDICT) sit underneath as a muted secondary line so
            cross-checking is still easy when senses diverge. */}
        {(() => {
          const ru = wordMeaningFullRu(w);
          const en = wordMeaningFullEn(w);
          if (!ru && !en) {
            return (
              <div className="text-sm text-[var(--foreground-soft)]">
                Перевод уточняется
              </div>
            );
          }
          return (
            <div className="flex flex-col items-center gap-2 max-w-sm">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                Значение
              </div>
              {ru ? (
                <div className="text-base leading-snug break-words">{ru}</div>
              ) : null}
              {en ? (
                <div
                  className={cn(
                    "leading-snug break-words",
                    ru
                      ? "text-xs text-[var(--foreground-soft)] mt-0.5"
                      : "text-base",
                  )}
                >
                  {ru ? <span className="opacity-70">EN · </span> : null}
                  {en}
                </div>
              ) : null}
            </div>
          );
        })()}

        {/* Characters inside the word — clickable, each shows its own
            pinyin and a short meaning to give a one-glance breakdown. */}
        {chars.length > 1 && (
          <div className="w-full max-w-sm">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2">
              Иероглифы в слове
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {chars.map((ch, i) => (
                <button
                  key={`${ch}-${i}`}
                  type="button"
                  onClick={() => openHanziByValue(ch)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl border border-[var(--border)] bg-white hover:bg-[var(--surface)] hover:shadow-sm transition-all text-left"
                >
                  <span className="hanzi text-3xl shrink-0 w-10 text-center">{ch}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--foreground-muted)] pinyin">
                      {pinyinOf(ch) || "—"}
                    </div>
                    <div className="text-xs truncate">
                      {displayMeaningOf(ch)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  })() : null;

  const detailNode = charDetail ?? wordDetail;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-medium">
          Словарь
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">
          {totalCount.toLocaleString()}
          {" "}
          {kind === "word" ? "слов" : kind === "hanzi" ? "иероглифов" : "записей"}
          {" · HSK 1-7"}
        </p>
      </header>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-soft)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: иероглиф, слово, пиньинь, перевод…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20 focus:border-[var(--green)] transition-shadow"
        />
      </div>

      {/* Kind segmented (Все / Иероглифы / Слова).
          Single source of truth for what dataset we draw from. Pills on
          desktop, horizontal-scroll chips on mobile via the same
          flex-overflow row used for HSK levels below. */}
      <div className="flex gap-1.5 overflow-x-auto scroll-hide mb-3 pb-0.5">
        {KIND_FILTERS.map((k) => {
          const active = kind === k.key;
          const Icon = k.key === "word" ? BookText : k.key === "hanzi" ? BookOpen : null;
          return (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all",
                active
                  ? "bg-[var(--green-soft)] border-[var(--green)] text-[var(--green-deep)] shadow-sm"
                  : "bg-white text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--foreground-soft)] hover:shadow-sm"
              )}
            >
              {Icon && <Icon size={12} />}
              {k.label}
            </button>
          );
        })}
      </div>

      {/* Level filters */}
      <div className="flex gap-1.5 overflow-x-auto scroll-hide mb-5 pb-0.5">
        {LEVELS.map((f) => {
          /* "Избранное" applies only to chars — hide it in Words mode
             so the filter doesn't return a confusing empty list. */
          if (f.key === "fav" && kind === "word") return null;
          return (
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
          );
        })}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Unified list */}
        <div>
          {list.length === 0 ? (
            <div className="text-sm text-[var(--foreground-muted)] py-12 text-center">
              <Search size={24} className="mx-auto mb-2 text-[var(--foreground-soft)]" />
              {!words && kind !== "hanzi"
                ? "Загружаю слова…"
                : "Ничего не найдено"}
            </div>
          ) : (
            <div className="space-y-1.5">
              {list.map((row) =>
                row.kind === "hanzi" ? (
                  <HanziRow
                    key={`h-${row.rec.hanzi}`}
                    c={row.rec}
                    active={picked?.kind === "hanzi" && picked.rec.hanzi === row.rec.hanzi}
                    fav={!!charsState[row.rec.hanzi]?.favorite}
                    onOpen={() => openChar(row.rec)}
                    onToggleFav={() => toggleFav(row.rec.hanzi)}
                  />
                ) : (
                  <WordRow
                    key={`w-${row.rec.word}`}
                    w={row.rec}
                    active={picked?.kind === "word" && picked.rec.word === row.rec.word}
                    onOpen={() => openWord(row.rec)}
                  />
                )
              )}
              {list.length >= 500 && (
                <div className="text-center py-4 text-xs text-[var(--foreground-soft)]">
                  Показано 500 из {totalCount.toLocaleString()} · уточните поиск
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop detail panel */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <Card className="p-6 sm:p-8 relative">
              {detailNode ?? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-3">
                    <Search size={24} className="text-[var(--foreground-soft)]" />
                  </div>
                  <div className="text-sm text-[var(--foreground-muted)]">
                    Выберите запись, чтобы увидеть детали
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile detail modal.
          We render through a portal to document.body so an ancestor's
          `will-change`/`transform` (e.g. PageTransition) can't trap our
          `position: fixed` inside a transformed containing block. The
          card is centred, capped at the small-tablet width, and scrolls
          internally if the content is taller than the screen. */}
      {picked && mobileDetail && createPortal(
        <div
          className="lg:hidden fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={
            picked.kind === "hanzi"
              ? `Детали: ${picked.rec.hanzi}`
              : `Детали слова: ${picked.rec.word}`
          }
        >
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileDetail(false)}
          />
          <div className="relative w-full max-w-md max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem))] bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col float-up">
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-6 pb-6">
              {detailNode}
            </div>
          </div>
        </div>,
        document.body,
      )}

      <AddToCollectionModal
        hanzi={addToCollectionFor}
        onClose={() => setAddToCollectionFor(null)}
      />
    </div>
  );
}

/* ─── Row components ──────────────────────────────────────────────
 * Split into two small renderers so the visual identity of words vs
 * hanzi stays obvious to the eye (and the layout intent is obvious in
 * the diff). The favorite star only exists on hanzi rows because the
 * progress store keys per-hanzi.
 */

function HanziRow({
  c,
  active,
  fav,
  onOpen,
  onToggleFav,
}: {
  c: CharRecord;
  active: boolean;
  fav: boolean;
  onOpen: () => void;
  onToggleFav: () => void;
}) {
  return (
    <button
      onClick={onOpen}
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
          {bestMeaning(c)}
        </div>
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleFav();
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
}

/**
 * A word row uses a softer, more "language-like" layout: pinyin in
 * its own small label above the simplified form, a slim vertical
 * separator that makes the lexeme feel like a phrase rather than a
 * symbol card, and a single-line English gloss below.
 */
function WordRow({
  w,
  active,
  onOpen,
}: {
  w: WordRecord;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        "w-full flex items-stretch gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-left transition-all",
        active
          ? "border-[var(--green)] bg-[var(--green-soft)] shadow-sm"
          : "border-transparent bg-white hover:bg-[var(--surface)] hover:shadow-sm"
      )}
    >
      <div className="shrink-0 flex flex-col items-center justify-center min-w-[64px] py-0.5">
        <span className="pinyin text-[11px] text-[var(--foreground-soft)] leading-tight tracking-wide">
          {w.pinyin || "—"}
        </span>
        <span className="hanzi text-xl sm:text-2xl mt-0.5">{w.word}</span>
      </div>
      <div className="w-px self-stretch bg-[var(--border)]/70" aria-hidden="true" />
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="text-sm leading-snug line-clamp-2">
          {wordMeaningShort(w) || "Перевод уточняется"}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--foreground-soft)]">
          <span className="px-1.5 py-0.5 rounded bg-[var(--surface-2)]">
            HSK {w.level === 7 ? "7-9" : w.level}
          </span>
          {w.pos && <span>{w.pos}</span>}
        </div>
      </div>
    </button>
  );
}

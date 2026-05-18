import charactersJson from "@/data/characters.json";
import lessonsJson from "@/data/lessons.json";

export interface CharRecord {
  hanzi: string;
  pinyin: string;
  level: number;
  freq: number;
  meaningPrimary: string;
  meaningsRu: string[];
  meaningsEn: string[];
  hasStrokes: boolean;
  decomposition?: string;
  components?: string[];
  radical?: string;
  etymology?: string;
  /** Per-stroke component index — for grapheme→stroke highlight. */
  strokeToComponent?: number[];
}

export interface Lesson {
  id: string;
  level: number;
  index: number;
  characters: string[];
  /** Curated lesson title, e.g. «Знакомство». Falls back to «Урок N» in UI. */
  title?: string;
  /** Theme/chapter grouping, e.g. «Основы общения». */
  theme?: string;
  grammarNote?: {
    title: string;
    body: string;
    examples?: { hanzi: string; pinyin: string; ru: string }[];
  };
}

export const ALL_CHARACTERS: CharRecord[] = charactersJson as CharRecord[];
export const ALL_LESSONS: Lesson[] = lessonsJson as Lesson[];
/** @deprecated Use ALL_LESSONS instead */
export const HSK1_LESSONS: Lesson[] = ALL_LESSONS.filter((l) => l.level === 1);

export function getLessonsByLevel(level: number): Lesson[] {
  return ALL_LESSONS.filter((l) => l.level === level);
}

const byHanzi = new Map<string, CharRecord>();
for (const c of ALL_CHARACTERS) byHanzi.set(c.hanzi, c);

export function getChar(hanzi: string): CharRecord | undefined {
  return byHanzi.get(hanzi);
}

export function getLesson(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}

/**
 * Returns the Russian display meaning for a character. Returns an empty
 * string when no Russian translation exists — callers should treat that as
 * "no meaning available" rather than silently falling back to English.
 */
export function meaningRu(c: CharRecord): string {
  if (c.meaningsRu && c.meaningsRu.length > 0) return c.meaningsRu[0];
  if (c.meaningPrimary && /[\u0400-\u04FF]/.test(c.meaningPrimary)) {
    return c.meaningPrimary;
  }
  return "";
}

/** True when the character has a usable Russian meaning. */
export function hasRu(c: CharRecord): boolean {
  return Boolean(meaningRu(c));
}

/**
 * A short, single-clause meaning suitable for buttons and lists. CEDICT defs
 * often contain several semicolon-separated clauses or parenthetical notes,
 * which look noisy as multiple-choice options.
 */
export function meaningShort(c: CharRecord): string {
  const raw = meaningRu(c);
  if (!raw) return "";
  let s = raw;
  // Drop CEDICT cross-reference annotations: `[pin1 yin1]` and CJK refs
  // like `十干[shi2 tian1 gan1]` or trailing `→ 字`.
  s = s.replace(/\[[^\]]*\]/g, "");
  s = s.replace(/[\u3400-\u9fff]+/g, "");
  // Drop leading parenthetical qualifiers like "(sentence-final particle) X"
  s = s.replace(/^\s*\([^)]*\)\s*/u, "");
  // Cut at first semicolon / slash to keep a single sense.
  s = s.split(/[;／/]/, 1)[0];
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return raw.split(/[;／/]/, 1)[0].trim();
  return s.length > 36 ? s.slice(0, 33).trimEnd() + "…" : s;
}

/** Returns all chars in a given HSK level. */
export function charsByLevel(level: number): CharRecord[] {
  return ALL_CHARACTERS.filter((c) => c.level === level);
}

/**
 * The first English meaning, cleaned up the same way `meaningShort` cleans
 * the Russian one. Used as the second-tier fallback when the character has
 * no Russian translation in the dataset.
 */
export function meaningEnShort(c: CharRecord): string {
  const raw = c.meaningsEn?.[0];
  if (!raw) return "";
  let s = raw;
  s = s.replace(/\[[^\]]*\]/g, "");
  s = s.replace(/[\u3400-\u9fff]+/g, "");
  s = s.replace(/^\s*\([^)]*\)\s*/u, "");
  s = s.split(/[;／/]/, 1)[0];
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return raw.split(/[;／/]/, 1)[0].trim();
  return s.length > 36 ? s.slice(0, 33).trimEnd() + "…" : s;
}

/**
 * Calm Russian placeholder used as the last-resort fallback for any card
 * whose translation we don't have. Centralised so it stays consistent
 * across grapheme search, dictionary list and detail panels.
 */
export const MEANING_PLACEHOLDER = "значение уточняется";

/**
 * Best-effort short meaning. Returns Russian when available, then English,
 * then a calm Russian placeholder. Never returns an empty string — callers
 * (especially card grids) can rely on this for consistent baseline height.
 */
export function bestMeaning(c: CharRecord): string {
  const ru = meaningShort(c);
  if (ru) return ru;
  const en = meaningEnShort(c);
  if (en) return en;
  return MEANING_PLACEHOLDER;
}

/**
 * Best-effort short meaning for an arbitrary hanzi string — works even
 * when the character is outside our HSK 3.0 dataset (the grapheme search
 * happily returns any character from MMAH).
 */
export function bestMeaningOf(hanzi: string): string {
  const c = byHanzi.get(hanzi);
  return c ? bestMeaning(c) : MEANING_PLACEHOLDER;
}

/**
 * Long-form meaning suitable for the character detail panel: takes the
 * full Russian primary meaning when available, then falls back to the
 * first English sense, then to the placeholder. Unlike `bestMeaning` this
 * keeps the full multi-clause text (e.g. «сумка / заворачивать») so the
 * detail card stays informative.
 */
export function bestMeaningFull(c: CharRecord): string {
  const ru = meaningRu(c);
  if (ru) return ru;
  const primary = c.meaningPrimary?.trim();
  if (primary) return primary;
  const en = c.meaningsEn?.[0]?.trim();
  if (en) return en;
  return MEANING_PLACEHOLDER;
}

/**
 * Best-effort pinyin for an arbitrary hanzi. Falls back to an empty
 * string when even the data file lacks pinyin — callers should render
 * "—" or similar rather than an empty line.
 */
export function pinyinOf(hanzi: string): string {
  const c = byHanzi.get(hanzi);
  return c?.pinyin ?? "";
}

/* ─── Component labels ────────────────────────────────────────────────
 * Many "graphemes" returned by the MMAH stroke index don't have a
 * dictionary meaning of their own — they exist only as building blocks
 * for other characters (亻, 氵, 阝, archaic forms, rare radicals…).
 * Rather than printing the generic "значение уточняется" placeholder we
 * pick an honest label that tells the user *why* there's no translation.
 *
 * Heuristics — intentionally conservative, all derived from data we
 * already have:
 *   • CJK Unified Ideographs Extension A (U+3400–U+4DBF) → almost
 *     always rare/archaic. We call those «историческая форма».
 *   • Kangxi Radicals (U+2F00–U+2FDF) and CJK Radicals Supplement
 *     (U+2E80–U+2EFF) → standalone radical glyphs. We call those
 *     «редкий ключ».
 *   • Anything that *is* listed as a radical or component of another
 *     character in our HSK data → «графема».
 *   • Everything else without a Ru/En meaning → «служебный компонент»
 *     (the catch-all for auxiliary forms like 亻, 氵).
 */
export type ComponentLabel =
  | "графема"
  | "служебный компонент"
  | "редкий ключ"
  | "историческая форма";

/** Pre-computed set of hanzi that appear as a radical/component of some
 *  character in our dataset — used to decide if a glyph is a known
 *  building block (→ «графема»). Built once at module load. */
const COMPONENT_HANZI: Set<string> = (() => {
  const s = new Set<string>();
  for (const c of ALL_CHARACTERS) {
    if (c.radical) s.add(c.radical);
    if (c.components) for (const k of c.components) s.add(k);
  }
  return s;
})();

export function componentLabelFor(hanzi: string): ComponentLabel {
  const code = hanzi.codePointAt(0) ?? 0;
  // Kangxi Radicals / CJK Radicals Supplement — radical-only glyphs.
  if (code >= 0x2e80 && code <= 0x2fdf) return "редкий ключ";
  // CJK Extension A — typically archaic forms (人 vs 亻 lives in main
  // block, but 𠆢-style variants live here).
  if (code >= 0x3400 && code <= 0x4dbf) return "историческая форма";
  if (COMPONENT_HANZI.has(hanzi)) return "графема";
  return "служебный компонент";
}

/**
 * Short display meaning for cards/buttons. Uses Russian → English →
 * honest component label (never the «значение уточняется» placeholder).
 * Returns a non-empty string.
 */
export function displayMeaning(c: CharRecord): string {
  const ru = meaningShort(c);
  if (ru) return ru;
  const en = meaningEnShort(c);
  if (en) return en;
  return componentLabelFor(c.hanzi);
}

/** {@link displayMeaning} for an arbitrary hanzi string. */
export function displayMeaningOf(hanzi: string): string {
  const c = byHanzi.get(hanzi);
  if (c) return displayMeaning(c);
  return componentLabelFor(hanzi);
}

/**
 * Long-form display meaning for detail panels. Like {@link bestMeaningFull},
 * but uses the component-label fallback instead of «значение уточняется».
 */
export function displayMeaningFull(c: CharRecord): string {
  const ru = meaningRu(c);
  if (ru) return ru;
  const primary = c.meaningPrimary?.trim();
  if (primary && primary !== MEANING_PLACEHOLDER) return primary;
  const en = c.meaningsEn?.[0]?.trim();
  if (en) return en;
  return componentLabelFor(c.hanzi);
}

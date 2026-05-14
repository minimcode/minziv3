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

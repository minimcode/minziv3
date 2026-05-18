import sentencesJson from "@/data/sentences.json";
import imageMatchJson from "@/data/imageMatch.json";

export interface SentencePattern {
  id: string;
  /** Individual hanzi characters in canonical writing order. */
  hanzi: string[];
  pinyin: string;
  /** Russian translation (full sentence). */
  ru: string;
  /** Word-level tokens used for the assembly task — may be multi-char. */
  tokens: string[];
  /** Grammar particle highlighted by this sentence, if any. */
  particle: string | null;
  /** Explanation of why the word order is correct. */
  note: string;
}

export interface ImageMatchEntry {
  hanzi: string;
  pinyin: string;
  ru: string;
  emoji: string;
}

export const SENTENCE_PATTERNS: SentencePattern[] = sentencesJson as SentencePattern[];
export const IMAGE_MATCH_ENTRIES: ImageMatchEntry[] = imageMatchJson as ImageMatchEntry[];

const sentenceCharIndex = new Map<string, SentencePattern[]>();
for (const s of SENTENCE_PATTERNS) {
  for (const ch of s.hanzi) {
    const list = sentenceCharIndex.get(ch);
    if (list) list.push(s);
    else sentenceCharIndex.set(ch, [s]);
  }
}

/**
 * Find sentence patterns that include `hanzi`. Limited to patterns whose
 * tokens are mostly built from `studiedChars` so we never quiz the user on
 * vocab they haven't seen yet.
 *
 *   • A token is "covered" if every char in it is studied OR is the
 *     target `hanzi` itself.
 *   • A pattern qualifies when at most one token is uncovered.
 *
 * This implements the «использовать только уже изученные слова + максимум
 * 1 новый элемент» rule from the spec.
 */
export function patternsFor(
  hanzi: string,
  studied: ReadonlySet<string>
): SentencePattern[] {
  const candidates = sentenceCharIndex.get(hanzi) ?? [];
  return candidates.filter((p) => {
    let uncovered = 0;
    for (const tok of p.tokens) {
      const ok = [...tok].every((c) => c === hanzi || studied.has(c));
      if (!ok) uncovered += 1;
      if (uncovered > 1) return false;
    }
    return true;
  });
}

const imageByHanzi = new Map<string, ImageMatchEntry>();
for (const e of IMAGE_MATCH_ENTRIES) imageByHanzi.set(e.hanzi, e);

export function imageFor(hanzi: string): ImageMatchEntry | undefined {
  return imageByHanzi.get(hanzi);
}

/** Get up to N image-match entries that include `target` + visually
 *  distinct distractors (different first emoji codepoint). */
export function buildImageQuiz(
  target: string,
  distractorCount: number = 3
): { entry: ImageMatchEntry; options: string[] } | null {
  const entry = imageByHanzi.get(target);
  if (!entry) return null;
  const pool = IMAGE_MATCH_ENTRIES.filter((e) => e.hanzi !== target);
  // Seeded shuffle keyed on the target hanzi (React purity).
  let s = 2166136261;
  for (let i = 0; i < target.length; i++) {
    s = Math.imul((s ^ target.charCodeAt(i)) >>> 0, 16777619);
  }
  const ranked = pool
    .map((e, i) => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return { e, k: (s + i * 9301) >>> 0 };
    })
    .sort((a, b) => a.k - b.k)
    .map((p) => p.e);
  const distractors = ranked.slice(0, distractorCount).map((e) => e.hanzi);
  // Final order is also seeded.
  const all = [entry.hanzi, ...distractors];
  const order = all
    .map((h, i) => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return { h, k: (s + i * 9301) >>> 0 };
    })
    .sort((a, b) => a.k - b.k)
    .map((p) => p.h);
  return { entry, options: order };
}

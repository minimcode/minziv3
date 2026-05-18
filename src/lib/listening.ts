/**
 * Helpers for the listening quiz exercise.
 *
 * `buildListeningQuiz(target, pool)` returns a stable, seeded set of 4
 * options: the target plus 3 distractors. Distractor selection is tiered
 * so the difficulty is calibrated:
 *
 *   1. same pinyin sans tone (homophone, different tone) — hardest;
 *   2. same initial consonant — medium;
 *   3. random char from the same HSK level — easiest fallback.
 *
 * Each tier contributes until the distractor list has 3 entries.
 */

import type { CharRecord } from "./characters";
import { stripPinyinTones } from "./words";

function stripPunct(p: string): string {
  return stripPinyinTones(p).replace(/\d|\s|·|·/g, "").toLowerCase();
}

function syllableOf(p: string): string {
  const cleaned = stripPunct(p);
  // Use only the first syllable. For multi-syllable chars (rare in our
  // dataset) we still index by the leading syllable so tone-confusion
  // distractors stay coherent.
  const m = cleaned.match(/^[a-z]+/);
  return m ? m[0] : cleaned;
}

function initialOf(p: string): string {
  const s = syllableOf(p);
  // Pinyin initials are up to two letters: ch/sh/zh, otherwise one. We're
  // permissive — '' (zero initial) for vowel-onset syllables is fine.
  if (s.startsWith("ch") || s.startsWith("sh") || s.startsWith("zh")) {
    return s.slice(0, 2);
  }
  return s.slice(0, 1);
}

function seed(text: string): number {
  let s = 2166136261;
  for (let i = 0; i < text.length; i++) {
    s = Math.imul((s ^ text.charCodeAt(i)) >>> 0, 16777619);
  }
  return s >>> 0;
}

function nextRand(state: { s: number }): number {
  state.s = (Math.imul(state.s, 1664525) + 1013904223) >>> 0;
  return state.s;
}

function shuffle<T>(arr: readonly T[], rng: { s: number }): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = nextRand(rng) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Return up to 4 character options (target plus distractors). */
export function buildListeningQuiz(
  target: CharRecord,
  pool: readonly CharRecord[],
  count: number = 4
): CharRecord[] {
  const targetSyll = syllableOf(target.pinyin);
  const targetInitial = initialOf(target.pinyin);
  const others = pool.filter(
    (c) => c.hanzi !== target.hanzi && c.pinyin && c.meaningsRu && c.meaningsRu.length > 0
  );

  const rng = { s: seed(target.hanzi) || 1 };

  // Tier 1: same toneless syllable (tone confusion).
  const sameSyll = shuffle(
    others.filter((c) => syllableOf(c.pinyin) === targetSyll),
    rng
  );

  // Tier 2: same initial consonant but different syllable. Bias toward
  // the same HSK level so the distractors stay age-appropriate.
  const sameInitial = shuffle(
    others.filter(
      (c) =>
        initialOf(c.pinyin) === targetInitial &&
        syllableOf(c.pinyin) !== targetSyll
    ),
    rng
  ).sort((a, b) => Math.abs(a.level - target.level) - Math.abs(b.level - target.level));

  // Tier 3: anything from same level.
  const sameLevel = shuffle(
    others.filter((c) => c.level === target.level),
    rng
  );

  const need = Math.max(0, count - 1);
  const seen = new Set<string>([target.hanzi]);
  const distractors: CharRecord[] = [];
  for (const tier of [sameSyll, sameInitial, sameLevel, shuffle(others, rng)]) {
    for (const c of tier) {
      if (distractors.length >= need) break;
      if (seen.has(c.hanzi)) continue;
      seen.add(c.hanzi);
      distractors.push(c);
    }
    if (distractors.length >= need) break;
  }

  const all = [target, ...distractors];
  return shuffle(all, rng);
}

/**
 * Returns true when the target has at least 2 tone-confusable siblings in
 * the pool (excluding itself). Used to decide whether the «какой тон?»
 * variant makes sense — otherwise the user would just pick the only
 * tonally-related option and learn nothing.
 */
export function hasToneConfusables(
  target: CharRecord,
  pool: readonly CharRecord[]
): boolean {
  const syll = syllableOf(target.pinyin);
  let n = 0;
  for (const c of pool) {
    if (c.hanzi === target.hanzi) continue;
    if (!c.meaningsRu || c.meaningsRu.length === 0) continue;
    if (syllableOf(c.pinyin) === syll) n += 1;
    if (n >= 2) return true;
  }
  return false;
}

/**
 * Visually similar character groups. Used by the review system to:
 *
 *   • show a "не путайте" panel when the user has both members of a
 *     confusion pair in their progress and confuses them in recognition;
 *   • generate higher-quality distractor pools (a Recognition quiz that
 *     puts 我 next to 找 trains the user to distinguish them rather than
 *     pairing 我 with an unrelated character);
 *   • highlight matching radicals in grapheme search.
 *
 * Groups are hand-curated based on the canonical HSK 1-3 confusables that
 * native learners report most often. Each group is small (2-4 chars) so the
 * UI can always render the full set without truncation.
 *
 * Source: HSK 3.0 frequency list cross-referenced with common
 * "look-alike" pairs from Chinese pedagogy literature.
 */
export const CONFUSION_GROUPS: ReadonlyArray<readonly string[]> = [
  // Pronouns vs. verbs that share 戈
  ["我", "找"],
  // Earth vs. scholar (one extra stroke)
  ["土", "士"],
  // Sun vs. eye (one extra horizontal)
  ["日", "目"],
  // Big vs. dog vs. heaven (a dot moves)
  ["大", "犬", "天"],
  // Person vs. enter
  ["人", "入"],
  // Knife vs. power
  ["刀", "力"],
  // Stop / foot / proper
  ["止", "正"],
  // Wood / not yet / end
  ["木", "未", "末"],
  // Dawn / sun-and-something
  ["旦", "早"],
  // Soldier vs. tracks (HSK pair)
  ["兵", "丘"],
  // Wait / hold / temple
  ["待", "持", "寺"],
  // White / hundred / self
  ["白", "百", "自"],
  // Day / white (vertical bar)
  ["日", "白"],
  // Block / again (left/right strokes)
  ["又", "叉"],
  // Already / oneself / serpent (radical pair)
  ["已", "己", "巳"],
  // Today / be (very common)
  ["今", "令"],
  // Mouth / surround
  ["口", "囗"],
  // Hand variants
  ["手", "毛"],
  // Buy/sell (mirror)
  ["买", "卖"],
] as const;

const groupByChar = new Map<string, readonly string[]>();
for (const g of CONFUSION_GROUPS) {
  for (const ch of g) {
    if (!groupByChar.has(ch)) groupByChar.set(ch, g);
  }
}

/** Return the confusion group a character belongs to, or null. */
export function confusionGroupFor(hanzi: string): readonly string[] | null {
  return groupByChar.get(hanzi) ?? null;
}

/** Return other characters that look similar to `hanzi`. */
export function similarTo(hanzi: string): string[] {
  const g = groupByChar.get(hanzi);
  if (!g) return [];
  return g.filter((c) => c !== hanzi);
}

/** Whether `a` and `b` are members of the same confusion group. */
export function areConfused(a: string, b: string): boolean {
  const g = groupByChar.get(a);
  return !!g && g.includes(b);
}

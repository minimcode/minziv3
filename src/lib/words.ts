/**
 * HSK 3.0 vocabulary (multi-character words) — separate dataset from
 * `characters.ts` to keep the hanzi-first flow intact. We load words
 * lazily via dynamic import so the initial dictionary paint isn't
 * blocked on parsing ~1.6 MB of JSON on mobile Safari.
 *
 * Each entry mirrors `CharRecord` only where it's natural (level,
 * pinyin, primary meaning); the `word` field is the actual lexeme so
 * a single `DictItem` union below can carry either a hanzi or a word
 * without overloading the same field.
 */

export interface WordRecord {
  /** Simplified-Chinese surface form, e.g. "喜欢", "学校", "认识". */
  word: string;
  /** Pinyin with tone diacritics, e.g. "xǐhuan". */
  pinyin: string;
  /** HSK 3.0 level — 1..6, or 7 for the combined 7-9 band. */
  level: number;
  /** Part of speech tag from HSK list ("V", "N/Adv", …). Optional. */
  pos: string;
  /** Up to ~6 English glosses pulled from CC-CEDICT. */
  meaningsEn: string[];
  /** First non-cross-reference English gloss. May be "". */
  meaningPrimary: string;
  /** Traditional form when it differs from `word`. */
  traditional?: string;
  /**
   * Russian glosses (БКРС / Wiktionary-derived). Optional because the
   * upstream coverage is partial — when missing we fall back to
   * `meaningsEn`. Stored as an array to preserve sense separation the
   * same way English meanings are split.
   */
  meaningsRu?: string[];
  /** First Russian gloss, used for cards. May be empty. */
  meaningRuPrimary?: string;
}

/**
 * Discriminated union used by the dictionary list / search / future
 * review system. The `value` is the canonical key (hanzi for chars,
 * simplified word for words) — useful when persisting selections to
 * collections / progress without losing the distinction.
 */
export type DictKind = "hanzi" | "word";
export interface HanziItem {
  type: "hanzi";
  value: string;
}
export interface WordItem {
  type: "word";
  value: string;
}
export type DictItem = HanziItem | WordItem;

/* ─── Lazy loading ─────────────────────────────────────────────────
 * Dynamic import keeps words.json out of the initial JS bundle. The
 * dictionary page calls `loadWords()` in a `useEffect`; the resolved
 * array is memoized on the module so repeat callers don't re-parse.
 */
let _wordsCache: WordRecord[] | null = null;
let _wordsPromise: Promise<WordRecord[]> | null = null;

export async function loadWords(): Promise<WordRecord[]> {
  if (_wordsCache) return _wordsCache;
  if (_wordsPromise) return _wordsPromise;
  _wordsPromise = import("@/data/words.json").then((m) => {
    const arr = (m.default ?? m) as unknown as WordRecord[];
    _wordsCache = arr;
    return arr;
  });
  return _wordsPromise;
}

/* ─── Tone stripping for fuzzy pinyin search ────────────────────────
 * Users type "xihuan" without diacritics — strip tones once when we
 * build the index, and once on every keystroke for the query. NFD
 * decomposes "ǎ" into "a" + combining mark which we then drop.
 */
export function stripPinyinTones(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/* ─── Indexed search ───────────────────────────────────────────────
 * Built once per `loadWords()` resolution. We avoid lower-casing /
 * tone-stripping inside `useMemo` on every keystroke — that's the
 * "performance, especially mobile Safari" requirement.
 *
 * The index also splits pinyin into syllables and meanings into tokens
 * so that scoreEntry below can reward word-boundary matches over noisy
 * infix hits (e.g. "hi" → 你好, not "c**hi**na").
 */
interface WordSearchEntry {
  rec: WordRecord;
  /** Lower-cased pinyin with tones removed, syllables joined by space. */
  pinyinPlain: string;
  /** Same as pinyinPlain but with no separators — for raw infix match. */
  pinyinSquashed: string;
  /** Pinyin syllables (lower-cased, tone-stripped). */
  pinyinSyllables: string[];
  /** Lower-cased concatenated English glosses. */
  meaningsLower: string;
  /** Tokenized English meaning words for word-boundary matching. */
  meaningTokens: string[];
  /** Lower-cased concatenated Russian glosses. */
  russianLower: string;
  /** Tokenized Russian meaning words. */
  russianTokens: string[];
}

let _index: WordSearchEntry[] | null = null;
let _indexRev = 0;

function tokenize(s: string): string[] {
  /* Split on anything that isn't a letter or digit (covers latin,
     cyrillic, CJK punctuation, brackets, slashes). Then drop tiny
     stop-words that would explode the candidate set. */
  if (!s) return [];
  const raw = s
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return raw.filter((t) => t.length >= 2 || /^[a-z]$/.test(t));
}

export function buildWordIndex(words: WordRecord[]): WordSearchEntry[] {
  if (_index && _indexRev === words.length) return _index;
  _index = words.map((w) => {
    const pinyinPlain = stripPinyinTones(w.pinyin);
    const meanings = w.meaningsEn.join(" | ");
    const russian = (w.meaningsRu ?? []).join(" | ");
    return {
      rec: w,
      pinyinPlain,
      pinyinSquashed: pinyinPlain.replace(/\s+/g, ""),
      pinyinSyllables: pinyinPlain.split(/\s+/).filter(Boolean),
      meaningsLower: meanings.toLowerCase(),
      meaningTokens: tokenize(meanings),
      russianLower: russian.toLowerCase(),
      russianTokens: tokenize(russian),
    };
  });
  _indexRev = words.length;
  return _index;
}

/* ─── Query classification ─────────────────────────────────────────
 * "hi" matching every "c**hi**na" was the symptom; the cure is to
 * treat short ASCII queries as word-boundary searches. We classify
 * the query once per call so scoreEntry below can branch cheaply.
 */
function classifyQuery(q: string): {
  isCjk: boolean;
  isAlpha: boolean;
  isShort: boolean;
} {
  const isCjk = /[\u3400-\u9fff]/.test(q);
  const isAlpha = !isCjk && /^[\p{L}]+$/u.test(q);
  return { isCjk, isAlpha, isShort: q.length <= 3 };
}

/* Score a single entry against a normalized query. Higher is better.
 * Returning 0 means "no match" — caller drops the row. The numbers
 * are chosen so categories never cross: exact > prefix > word-boundary
 * > infix, with pinyin matches roughly equal to hanzi. */
function scoreEntry(
  e: WordSearchEntry,
  q: string,
  qLower: string,
  qPinyin: string,
  cls: { isCjk: boolean; isAlpha: boolean; isShort: boolean },
): number {
  let score = 0;
  const w = e.rec.word;

  /* Hanzi surface form (matches CJK queries; also handles users
     pasting a single hanzi from elsewhere). */
  if (cls.isCjk) {
    if (w === q) score += 1100;
    else if (w.startsWith(q)) score += 700;
    else if (w.includes(q)) score += 400;
  }

  /* Pinyin: prefer exact / prefix / per-syllable match before the
     dumb substring fallback. Short queries (≤3 chars) explicitly
     refuse interior matches — e.g. "hi" must NOT match "shi". */
  if (cls.isAlpha) {
    if (e.pinyinPlain === qPinyin || e.pinyinSquashed === qPinyin) {
      score += 1000;
    } else if (
      e.pinyinPlain.startsWith(qPinyin) ||
      e.pinyinSquashed.startsWith(qPinyin)
    ) {
      score += 600;
    } else {
      let syll = 0;
      for (const s of e.pinyinSyllables) {
        if (s === qPinyin) syll = Math.max(syll, 500);
        else if (s.startsWith(qPinyin)) syll = Math.max(syll, 300);
        else if (!cls.isShort && s.includes(qPinyin) && qPinyin.length >= 4) {
          syll = Math.max(syll, 120);
        }
      }
      score += syll;
      /* Tight infix fallback for compound pinyin like "nihao". Only
         worth a small boost — exact / prefix should win first. */
      if (
        !syll &&
        !cls.isShort &&
        e.pinyinSquashed.includes(qPinyin) &&
        qPinyin.length >= 4
      ) {
        score += 80;
      }
    }
  }

  /* English meanings — token-level for short queries, substring
     allowed for longer queries where users type a phrase. */
  if (cls.isAlpha) {
    let mScore = 0;
    for (const t of e.meaningTokens) {
      if (t === qLower) {
        mScore = Math.max(mScore, 800);
        break;
      } else if (t.startsWith(qLower) && qLower.length >= 3) {
        mScore = Math.max(mScore, 350);
      }
    }
    if (!mScore && !cls.isShort && qLower.length >= 4) {
      if (e.meaningsLower.includes(qLower)) mScore = 90;
    }
    score += mScore;
  }

  /* Russian meanings — cyrillic queries hit this path; we still allow
     short token-prefix matches because Russian doesn't have a
     single-letter noise problem like English "hi" in "china". */
  if (!cls.isCjk && /[\p{Script=Cyrillic}]/u.test(q)) {
    let rScore = 0;
    for (const t of e.russianTokens) {
      if (t === qLower) {
        rScore = Math.max(rScore, 850);
        break;
      } else if (t.startsWith(qLower) && qLower.length >= 2) {
        rScore = Math.max(rScore, 400);
      }
    }
    if (!rScore && qLower.length >= 3 && e.russianLower.includes(qLower)) {
      rScore = 120;
    }
    score += rScore;
  }

  return score;
}

export function searchWords(
  words: WordRecord[],
  query: string,
  limit = 200,
): WordRecord[] {
  if (!query) return words.slice(0, limit);
  const q = query.trim();
  if (!q) return words.slice(0, limit);
  const idx = buildWordIndex(words);
  const qLower = q.toLowerCase();
  const qPinyin = stripPinyinTones(q);
  const cls = classifyQuery(q);

  const scored: { rec: WordRecord; score: number }[] = [];
  for (const e of idx) {
    const s = scoreEntry(e, q, qLower, qPinyin, cls);
    if (s > 0) scored.push({ rec: e.rec, score: s });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    /* Tie-break: lower HSK first (more common), then shorter word. */
    if (a.rec.level !== b.rec.level) return a.rec.level - b.rec.level;
    return a.rec.word.length - b.rec.word.length;
  });
  return scored.slice(0, limit).map((s) => s.rec);
}

/* ─── Helpers ──────────────────────────────────────────────────────
 * Cheap derivations used by cards / detail panels. Keep them pure so
 * React's `useMemo` can dedupe their results across renders.
 */
export function wordsByLevel(words: WordRecord[], level: number): WordRecord[] {
  if (level === 7) return words.filter((w) => w.level >= 7);
  return words.filter((w) => w.level === level);
}

/**
 * Short, one-clause primary meaning suitable for cards. Russian wins
 * when available (БКРС-derived), English is the fallback so older
 * entries / rare words still render something. The cleanup mirrors
 * `meaningShort` for characters.
 */
export function wordMeaningShort(w: WordRecord): string {
  const ru = w.meaningRuPrimary || w.meaningsRu?.[0] || "";
  if (ru) {
    const s = ru.replace(/\s+/g, " ").trim();
    return s.length > 60 ? s.slice(0, 56).trimEnd() + "…" : s;
  }
  const raw = w.meaningPrimary || w.meaningsEn?.[0] || "";
  if (!raw) return "";
  let s = raw;
  s = s.replace(/\[[^\]]*\]/g, "");
  s = s.replace(/[\u3400-\u9fff]+/g, "");
  s = s.replace(/^\s*\([^)]*\)\s*/u, "");
  s = s.split(/[;／/]/, 1)[0];
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return raw.split(/[;／/]/, 1)[0].trim();
  return s.length > 48 ? s.slice(0, 45).trimEnd() + "…" : s;
}

/** Long-form Russian meaning for the word detail panel — joins all
 *  senses with bullets and strips any leaked markup. Falls back to
 *  English when no Russian is available. */
export function wordMeaningFullRu(w: WordRecord): string {
  const ru = w.meaningsRu ?? [];
  if (ru.length === 0) return "";
  return ru
    .map((d) =>
      d
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 6)
    .join(" · ");
}

/** Long-form English meaning, used as secondary line under the Russian
 *  meaning in the detail panel and as the only source for words still
 *  missing БКРС coverage. */
export function wordMeaningFullEn(w: WordRecord): string {
  const defs = w.meaningsEn || [];
  if (defs.length === 0) return "";
  return defs
    .map((d) =>
      d
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 4)
    .join(" · ");
}

/** @deprecated kept for older call sites — equivalent to
 *  `wordMeaningFullRu` when Russian is available, otherwise English. */
export function wordMeaningFull(w: WordRecord): string {
  return wordMeaningFullRu(w) || wordMeaningFullEn(w);
}

/* ─── Lesson-mapped vocabulary ─────────────────────────────────────
 * `lessonWords.json` is pre-computed by `scripts/build_lesson_words.py`
 * and maps every lesson id to a small (≤8) curated list of HSK words
 * that the user can actually parse — every char in the word is either
 * introduced in this lesson or in an earlier one.
 *
 * It's small enough (~600 KB) to import statically without breaking
 * the dictionary-page lazy-load story: importing from `@/lib/words`
 * inside lesson code only pulls this module when the lesson page is
 * rendered, and Next.js still keeps `words.json` itself behind the
 * dynamic import path above.
 */
import lessonWordsJson from "@/data/lessonWords.json";

/* The pre-trimmed payload omits empty fields (pos, traditional, …) so
   the JSON type doesn't structurally match `WordRecord` — cast via
   `unknown` and let the loader fill in defaults at the boundary. */
const LESSON_WORDS_RAW = lessonWordsJson as unknown as Record<
  string,
  Partial<WordRecord>[]
>;

export function getWordsForLesson(lessonId: string): WordRecord[] {
  const arr = LESSON_WORDS_RAW[lessonId];
  if (!arr) return [];
  return arr.map(
    (w): WordRecord => ({
      word: w.word ?? "",
      pinyin: w.pinyin ?? "",
      level: w.level ?? 7,
      pos: w.pos ?? "",
      meaningsEn: w.meaningsEn ?? [],
      meaningPrimary: w.meaningPrimary ?? "",
      meaningsRu: w.meaningsRu,
      meaningRuPrimary: w.meaningRuPrimary ?? w.meaningsRu?.[0],
    })
  );
}

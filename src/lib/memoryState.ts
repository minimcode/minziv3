import type { CharProgress } from "@/store/progress";

/**
 * Five memory states per §4 of the Minzi spec. The flashcard binary
 * known/unknown is replaced with a graded life-cycle:
 *
 *   Seen     — encountered, not yet engaged
 *   Learning — currently being introduced; daily contact
 *   Young    — recently graduated, fragile (interval < ~21d)
 *   Mature   — durable (interval ~21d – 6mo)
 *   Rooted   — permanent, no longer scheduled (interval > 6mo)
 *
 * The eventual scheduler is FSRS-4.5 (§5) with per-dimension state.
 * Until per-dimension SRS lands, this helper maps the existing
 * aggregate `CharProgress` onto one of the five states so the UI
 * can already speak the right language.
 */
export type MemoryState =
  | "seen"
  | "learning"
  | "young"
  | "mature"
  | "rooted";

export interface MemoryStateMeta {
  /** UI label, Russian, sentence case. */
  label: string;
  /** Short, one-line description used on the per-hanzi page. */
  hint: string;
  /** CSS color variable for the tile, palette-correct per §2. */
  tone: "stone" | "sage" | "jade" | "terracotta" | "ink";
}

export const MEMORY_STATES: Record<MemoryState, MemoryStateMeta> = {
  seen: {
    label: "Знакомлюсь",
    hint: "Иероглиф встречался один раз.",
    tone: "stone",
  },
  learning: {
    label: "Учу",
    hint: "Иероглиф в активной работе.",
    tone: "terracotta",
  },
  young: {
    label: "Свежее",
    hint: "Недавно изучено, ещё хрупко.",
    tone: "sage",
  },
  mature: {
    label: "Зрелое",
    hint: "Помнится надолго.",
    tone: "jade",
  },
  rooted: {
    label: "Укоренилось",
    hint: "Живёт в долговременной памяти.",
    tone: "ink",
  },
};

/**
 * Map a CharProgress onto a MemoryState.
 *
 *   • No progress at all          → Seen
 *   • status==='learning' or reps<3 → Learning
 *   • intervalDays < 21            → Young
 *   • 21 ≤ intervalDays < 180      → Mature
 *   • intervalDays ≥ 180           → Rooted
 *
 * "Weak" characters are treated as Learning regardless of interval —
 * they need active re-engagement (mirrors the spec's Repair movement).
 */
export function memoryStateFor(p: CharProgress | undefined): MemoryState {
  if (!p) return "seen";
  if (p.status === "new" && p.reps === 0) return "seen";
  if (p.status === "weak") return "learning";
  if (p.status === "learning" || p.reps < 3) return "learning";
  if (p.intervalDays < 21) return "young";
  if (p.intervalDays < 180) return "mature";
  return "rooted";
}

export function tallyMemoryStates(
  chars: Record<string, CharProgress>
): Record<MemoryState, number> {
  const out: Record<MemoryState, number> = {
    seen: 0,
    learning: 0,
    young: 0,
    mature: 0,
    rooted: 0,
  };
  for (const p of Object.values(chars)) {
    out[memoryStateFor(p)] += 1;
  }
  return out;
}

const TONE_CLASSES: Record<MemoryStateMeta["tone"], string> = {
  stone:
    "bg-[var(--surface-2)] border-[var(--border)] text-[var(--foreground)]",
  sage:
    "bg-[color:rgba(91,117,96,0.08)] border-[color:rgba(91,117,96,0.25)] text-[#3a5340]",
  jade:
    "bg-[color:rgba(111,160,140,0.08)] border-[color:rgba(111,160,140,0.25)] text-[#2f5a4a]",
  terracotta:
    "bg-[color:rgba(181,83,60,0.06)] border-[color:rgba(181,83,60,0.22)] text-[var(--red-deep)]",
  ink:
    "bg-[color:rgba(26,24,20,0.06)] border-[color:rgba(26,24,20,0.22)] text-[var(--ink)]",
};

export function toneClasses(tone: MemoryStateMeta["tone"]): string {
  return TONE_CLASSES[tone];
}

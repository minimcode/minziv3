"use client";

import { useState } from "react";
import { CharRecord, getChar, meaningShort } from "@/lib/characters";
import { cn } from "@/lib/cn";

interface Props {
  char: CharRecord;
  /** Currently selected component index (controlled). */
  selectedIndex?: number | null;
  /**
   * Called when the user picks a grapheme. The index refers to
   * `char.components[i]`; passes `null` when the user toggles the same
   * grapheme off.
   */
  onSelect?: (index: number | null) => void;
}

/**
 * Display the visual decomposition of a character as a row of clickable
 * grapheme cards (radical / components). Selecting a grapheme highlights
 * it and notifies the parent so the surrounding UI can react — for
 * example, recolouring the matching strokes in the character preview.
 */
export function Graphemes({ char, selectedIndex, onSelect }: Props) {
  const [internalIdx, setInternalIdx] = useState<number | null>(null);
  const isControlled = selectedIndex !== undefined;
  const picked = isControlled ? selectedIndex : internalIdx;

  if (!char.components || char.components.length === 0) return null;

  const handlePick = (i: number) => {
    const next = picked === i ? null : i;
    if (!isControlled) setInternalIdx(next);
    onSelect?.(next);
  };

  return (
    <div className="card-soft px-4 py-3 w-full">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2 text-center">
        Графемы
      </div>
      <div className="flex flex-wrap items-stretch justify-center gap-2">
        {char.components.map((g, i) => {
          const sub = getChar(g);
          const meaning = sub ? meaningShort(sub) : "";
          const isPicked = picked === i;
          return (
            <button
              key={`${g}-${i}`}
              type="button"
              onClick={() => handlePick(i)}
              className={cn(
                "border rounded-md px-3 py-2 flex items-center gap-2 transition-colors min-w-0",
                isPicked
                  ? "border-[var(--green)] bg-[var(--green-soft)]"
                  : "border-[var(--border)] bg-white hover:bg-[var(--surface-2)]"
              )}
              aria-pressed={isPicked}
            >
              <span
                className={cn(
                  "hanzi text-2xl leading-none shrink-0",
                  isPicked && "text-[var(--green-deep)]"
                )}
              >
                {g}
              </span>
              {meaning && (
                <span className="text-xs text-[var(--foreground-muted)] max-w-[140px] truncate">
                  {meaning}
                </span>
              )}
            </button>
          );
        })}
        {char.radical &&
          !char.components.includes(char.radical) &&
          char.radical !== char.hanzi && (
            <div className="border border-dashed border-[var(--border)] rounded-md px-3 py-2 flex items-center gap-2">
              <span className="hanzi text-2xl leading-none shrink-0">
                {char.radical}
              </span>
              <span className="text-xs text-[var(--foreground-muted)]">
                ключ
              </span>
            </div>
          )}
      </div>
      <div className="mt-2 text-[11px] text-[var(--foreground-soft)] text-center">
        Нажмите на графему — соответствующие черты подсветятся.
      </div>
    </div>
  );
}

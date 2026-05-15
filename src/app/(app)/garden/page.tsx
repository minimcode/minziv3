"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useProgress } from "@/store/progress";
import { useMounted } from "@/lib/useMounted";
import { Card } from "@/components/ui/Card";
import { Panda } from "@/components/ui/Panda";
import { Plant, stageForState } from "@/components/garden/Plant";
import {
  MEMORY_STATES,
  memoryStateFor,
  type MemoryState,
} from "@/lib/memoryState";
import { getChar } from "@/lib/characters";

/**
 * §15 / §19.5 #4 — The Garden.
 *
 * Every character the user has touched is rendered as an actual plant
 * whose growth stage matches its memory state:
 *
 *   Знакомлюсь  → семечко с первым листком
 *   Учу         → росток с двумя листами
 *   Свежее      → побег с бутоном
 *   Зрелое      → куст с цветами
 *   Укоренилось → деревце-бонсай
 *
 * No XP, no level, no «Garden 73%». The Garden is the library itself.
 */
export default function GardenPage() {
  const chars = useProgress((s) => s.chars);
  const mounted = useMounted();

  const grouped = useMemo(() => {
    const out: Record<MemoryState, string[]> = {
      seen: [],
      learning: [],
      young: [],
      mature: [],
      rooted: [],
    };
    if (!mounted) return out;
    // Most-recently-touched first within each state.
    const ordered = Object.values(chars).sort(
      (a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0),
    );
    for (const p of ordered) {
      out[memoryStateFor(p)].push(p.hanzi);
    }
    return out;
  }, [chars, mounted]);

  const total = Object.values(grouped).reduce((s, g) => s + g.length, 0);

  if (!mounted) return null;

  if (total === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
        <header className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)] mb-1">
            Сад
          </div>
          <h1 className="text-2xl font-display font-medium">
            Здесь пока ничего не растёт
          </h1>
        </header>
        <Card className="p-10 flex flex-col items-center text-center gap-4">
          <Panda mood="resting" size={140} />
          <p className="text-sm text-[var(--foreground-muted)] max-w-md">
            Каждый иероглиф, который вы запишете, появится здесь.
            Один в день — этого достаточно.
          </p>
          <Link href="/learn" className="btn btn-primary mt-2">
            Открыть первый иероглиф
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      <header className="mb-6">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)] mb-1">
          Сад
        </div>
        <h1 className="text-2xl font-display font-medium">Ваш сад</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1 max-w-xl">
          Каждый иероглиф — растение. Со временем семечки превращаются
          в кусты, а потом и в деревья — это и есть память.
        </p>
      </header>

      {/* Legend — quick visual reference for what each growth stage
          means, so the user can read the meadow at a glance. */}
      <Card className="p-4 sm:p-5 mb-8">
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {(Object.keys(MEMORY_STATES) as MemoryState[]).map((s) => (
            <div
              key={s}
              className="flex flex-col items-center text-center"
              title={MEMORY_STATES[s].hint}
            >
              <Plant state={s} size={48} />
              <div className="text-[10px] sm:text-xs font-medium mt-1 text-[var(--foreground)]">
                {stageForState(s)}
              </div>
              <div className="text-[9px] sm:text-[10px] text-[var(--foreground-soft)] leading-tight">
                {MEMORY_STATES[s].label}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-10">
        {(Object.keys(MEMORY_STATES) as MemoryState[])
          .filter((s) => grouped[s].length > 0)
          .map((s) => {
            const meta = MEMORY_STATES[s];
            return (
              <section key={s}>
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--foreground)]">
                    {meta.label}
                  </h2>
                  <span className="text-xs text-[var(--foreground-muted)] tabular-nums">
                    {grouped[s].length}
                  </span>
                  <span className="text-xs text-[var(--foreground-soft)] hidden sm:inline">
                    {meta.hint}
                  </span>
                </div>
                {/* The meadow: each character is a plant tile. */}
                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
                  {grouped[s].map((h) => {
                    const c = getChar(h);
                    return (
                      <Link
                        key={h}
                        href={`/hanzi/${encodeURIComponent(h)}`}
                        className="group flex flex-col items-center rounded-[12px] p-2 hover:bg-[var(--surface-2)] transition-colors"
                        title={c ? `${h} · ${c.meaningPrimary}` : h}
                      >
                        <div className="bg-gradient-to-b from-[#f3f6ee] to-[#e7ecdc] rounded-[10px] w-full aspect-square flex items-end justify-center pb-1 overflow-hidden border border-[color:rgba(91,117,96,0.18)]">
                          <Plant state={s} size={64} className="-mb-0.5" />
                        </div>
                        <span className="hanzi text-lg leading-none mt-2 text-[var(--ink)]">
                          {h}
                        </span>
                        {c?.pinyin && (
                          <span className="text-[10px] text-[var(--foreground-soft)] mt-0.5 tracking-tight">
                            {c.pinyin}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}

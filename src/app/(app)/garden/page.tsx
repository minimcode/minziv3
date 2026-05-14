"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useProgress } from "@/store/progress";
import { useMounted } from "@/lib/useMounted";
import { Card } from "@/components/ui/Card";
import { Panda } from "@/components/ui/Panda";
import {
  MEMORY_STATES,
  memoryStateFor,
  toneClasses,
  type MemoryState,
} from "@/lib/memoryState";
import { getChar } from "@/lib/characters";

/**
 * §15 / §19.5 #4 — The Garden.
 *
 * The Garden is the visible result of work. Each character the user
 * has touched is shown as a tile, grouped by memory state. There is
 * no XP, no level, no «Garden 73%». The Garden is the library itself.
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
      (a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0)
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
          <Link
            href="/learn"
            className="btn btn-primary mt-2"
          >
            Открыть первый иероглиф
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)] mb-1">
          Сад
        </div>
        <h1 className="text-2xl font-display font-medium">Ваш сад</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1 max-w-xl">
          Каждый иероглиф — росток. Со временем одни укрепляются,
          другие переходят в долгую память.
        </p>
      </header>

      <div className="space-y-8">
        {(Object.keys(MEMORY_STATES) as MemoryState[])
          .filter((s) => grouped[s].length > 0)
          .map((s) => {
            const meta = MEMORY_STATES[s];
            return (
              <section key={s}>
                <div className="flex items-baseline gap-3 mb-3">
                  <h2
                    className={`text-sm font-medium uppercase tracking-[0.18em] ${toneClasses(
                      meta.tone
                    )} px-2 py-0.5 rounded border-0`}
                  >
                    {meta.label}
                  </h2>
                  <span className="text-xs text-[var(--foreground-muted)] tabular-nums">
                    {grouped[s].length}
                  </span>
                  <span className="text-xs text-[var(--foreground-soft)]">
                    {meta.hint}
                  </span>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2">
                  {grouped[s].map((h) => {
                    const c = getChar(h);
                    return (
                      <Link
                        key={h}
                        href={`/hanzi/${encodeURIComponent(h)}`}
                        className="aspect-square flex flex-col items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors"
                        title={c ? `${h} · ${c.meaningPrimary}` : h}
                      >
                        <span className="hanzi text-2xl leading-none">{h}</span>
                        {c?.pinyin && (
                          <span className="text-[10px] text-[var(--foreground-soft)] mt-1 tracking-tight">
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

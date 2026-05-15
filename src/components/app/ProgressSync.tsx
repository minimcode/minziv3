"use client";

/**
 * Mounts the progress sync loop for authenticated users.
 *
 * Lifecycle:
 *  - Session goes from unauthenticated → authenticated:
 *      POST current local snapshot to /api/progress so server merges it
 *      against whatever was there from another device, then replace the
 *      local store with the merged result.
 *  - While authenticated:
 *      Subscribe to store changes. On any progress mutation, debounce 2s
 *      and POST the latest local snapshot. The response replaces local
 *      so cross-device merges propagate back.
 *
 * Guests (no session) don't run sync — the store keeps living in
 * localStorage exactly like before.
 */
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useProgress, type ProgressSnapshot } from "@/store/progress";

const DEBOUNCE_MS = 1500;

function snapshotFromStore(): ProgressSnapshot {
  const s = useProgress.getState();
  return {
    chars: s.chars,
    completedLessons: s.completedLessons,
    daily: s.daily,
    streak: s.streak,
    streakUpdated: s.streakUpdated,
  };
}

async function pushSnapshot(): Promise<ProgressSnapshot | null> {
  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshotFromStore()),
    });
    if (!res.ok) return null;
    return (await res.json()) as ProgressSnapshot;
  } catch {
    return null;
  }
}

export function ProgressSync() {
  const { status } = useSession();
  const lastSyncedKeyRef = useRef<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    // Initial reconciliation: push local → server merges → apply merged back.
    void (async () => {
      const merged = await pushSnapshot();
      if (cancelled || !merged) return;
      applyingRemoteRef.current = true;
      useProgress.getState().applyRemoteSnapshot(merged);
      // Allow the next microtask before re-enabling so the subscribe
      // callback below doesn't treat this merge as a local change.
      queueMicrotask(() => {
        applyingRemoteRef.current = false;
      });
    })();

    const scheduleFlush = () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(async () => {
        debounceRef.current = null;
        const merged = await pushSnapshot();
        if (!merged) return;
        const localKey = stableKey(snapshotFromStore());
        const remoteKey = stableKey(merged);
        // Only overwrite local if server returned something different —
        // avoids gratuitous re-renders.
        if (localKey !== remoteKey) {
          applyingRemoteRef.current = true;
          useProgress.getState().applyRemoteSnapshot(merged);
          queueMicrotask(() => {
            applyingRemoteRef.current = false;
          });
        }
      }, DEBOUNCE_MS);
    };

    const unsubscribe = useProgress.subscribe((s, prev) => {
      if (applyingRemoteRef.current) return;
      if (s === prev) return;
      // Cheap check: skip if nothing user-visible changed.
      const key = stableKey({
        chars: s.chars,
        completedLessons: s.completedLessons,
        daily: s.daily,
        streak: s.streak,
        streakUpdated: s.streakUpdated,
      });
      if (key === lastSyncedKeyRef.current) return;
      lastSyncedKeyRef.current = key;
      scheduleFlush();
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [status]);

  return null;
}

/** Tiny structural hash used to dedupe identical snapshots. The shape is
 *  small enough (few hundred entries) that JSON.stringify is cheap. */
function stableKey(snap: ProgressSnapshot): string {
  const sortedChars = Object.keys(snap.chars).sort();
  const charStr = sortedChars
    .map((h) => {
      const c = snap.chars[h];
      return `${h}:${c.reps}:${c.intervalDays}:${c.due}:${c.lastSeen ?? 0}:${
        c.favorite ? 1 : 0
      }:${c.status}`;
    })
    .join("|");
  const lessons = [...snap.completedLessons].sort().join(",");
  const daily = snap.daily
    .map((d) => `${d.date}:${d.reviewed}:${d.learned}:${d.correct}:${d.total}`)
    .join("|");
  return `${charStr}#${lessons}#${daily}#${snap.streak}#${snap.streakUpdated ?? ""}`;
}

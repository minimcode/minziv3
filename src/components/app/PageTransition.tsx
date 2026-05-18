"use client";

/**
 * Cross-fade + tiny vertical slide on route change.
 *
 * We key the wrapper by `pathname`, so React remounts the subtree on every
 * navigation. The CSS animation (`.page-enter`) runs once on mount; on the
 * next mount the keyframe replays automatically because it's a fresh node.
 *
 * The CSS itself lives in `globals.css` so SSR doesn't briefly flash the
 * uninitialised state, and so users with `prefers-reduced-motion: reduce`
 * get an instant swap (handled there as well).
 */
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

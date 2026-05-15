"use client";

import { useEffect, useState } from "react";

/**
 * Returns the current viewport width in CSS pixels. Returns `null`
 * during SSR/before mount so callers can avoid hydration mismatches.
 *
 * The value updates on `resize` so layouts react to phone rotation /
 * browser-window-resize. Throttled with rAF.
 */
export function useViewportWidth(): number | null {
  const [w, setW] = useState<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setW(window.innerWidth));
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return w;
}

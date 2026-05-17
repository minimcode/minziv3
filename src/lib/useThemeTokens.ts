"use client";

import { useEffect, useState } from "react";

/**
 * Reads design tokens from <html> computed style and re-evaluates when
 * the theme class on <html> changes (light <-> dark via <ThemeToggle> or
 * system pref). Used by canvas-based renderers like hanzi-writer that
 * need explicit color strings rather than CSS variables.
 */
export function useThemeTokens<K extends string>(names: K[]): Record<K, string> {
  const read = () => {
    if (typeof window === "undefined") {
      return Object.fromEntries(names.map((n) => [n, ""])) as Record<K, string>;
    }
    const style = window.getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const n of names) {
      out[n] = style.getPropertyValue(n).trim();
    }
    return out as Record<K, string>;
  };

  const [tokens, setTokens] = useState<Record<K, string>>(() => read());

  // SSR-safe sync: on mount we read the real computed style (the SSR
  // pass returned empty strings) and then subscribe to <html> class
  // mutations so the cached tokens follow theme switches.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokens(read());
    if (typeof window === "undefined") return;
    const html = document.documentElement;
    const observer = new MutationObserver(() => setTokens(read()));
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
    // We intentionally depend only on the JSON of `names` so the hook is
    // stable across re-renders when names is created inline by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.join(",")]);

  return tokens;
}

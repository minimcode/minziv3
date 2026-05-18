"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "minzi-theme";

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

function applyTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  const html = document.documentElement;
  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  const dark = mode === "dark" || (mode === "system" && prefersDark);
  html.classList.toggle("theme-dark", dark);
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/**
 * 3-way theme picker (Light / Dark / System).
 *
 * Reads & writes `localStorage["minzi-theme"]`. The pre-hydration script
 * in <RootLayout> initialises the `theme-dark` class before paint, so
 * here we only have to keep state in sync with user clicks and with
 * system-pref changes when in "system" mode.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  // Read the persisted choice after hydration. The pre-paint inline
  // script in <RootLayout> has already applied the right class, so this
  // is the only safe place to sync React state — a setState in this
  // effect is the recognised hydration pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setMode(readStoredTheme());
  }, []);

  // Re-apply when OS preference changes & we're tracking system.
  useEffect(() => {
    if (mode !== "system") return;
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyTheme("system");
    m.addEventListener?.("change", fn);
    return () => m.removeEventListener?.("change", fn);
  }, [mode]);

  function pick(next: ThemeMode) {
    setMode(next);
    applyTheme(next);
  }

  const options: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> =
    [
      { value: "light", label: "Светлая", icon: Sun },
      { value: "dark", label: "Тёмная", icon: Moon },
      { value: "system", label: "Системная", icon: Monitor },
    ];

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
      {options.map((o) => {
        const Icon = o.icon;
        const active = mounted && o.value === mode;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => pick(o.value)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              active
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon size={13} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

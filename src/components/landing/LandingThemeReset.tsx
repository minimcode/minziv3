/**
 * Forces the light palette on the marketing landing page, regardless of
 * the user's saved theme preference. Dark mode is reserved for the
 * signed-in product surface.
 *
 * The pre-hydration script in `<RootLayout>` already skips `theme-dark`
 * for pathname "/" on full page loads. This component covers client-side
 * route changes: e.g. navigating from `/learn` (dark) back to `/` via a
 * Next <Link>, where the head script does not re-run.
 *
 * On mount we strip `theme-dark`. On unmount we restore it based on the
 * persisted preference, so leaving the landing back into the app puts
 * the user's theme back without a reload.
 */
"use client";

import { useEffect } from "react";

export function LandingThemeReset() {
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("theme-dark");
    html.classList.remove("theme-dark");

    return () => {
      // Restore whatever the user actually has saved — not just whatever
      // class was there a moment ago, because the user might have toggled
      // themes while we were on the landing.
      try {
        const saved = localStorage.getItem("minzi-theme");
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        const shouldBeDark =
          saved === "dark" || ((saved === "system" || !saved) && prefersDark);
        if (shouldBeDark) html.classList.add("theme-dark");
        else if (hadDark) html.classList.remove("theme-dark");
      } catch {
        if (hadDark) html.classList.add("theme-dark");
      }
    };
  }, []);

  return null;
}

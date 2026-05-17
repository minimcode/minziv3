/**
 * Smart redirect for `/`:
 *   – Guests and authed-but-empty users see the marketing landing.
 *   – Authed users with progress are sent straight into the app:
 *       1) due reviews exist → /review
 *       2) otherwise         → /learn
 *
 * Progress lives in localStorage (zustand persist) so the decision is
 * client-side. We render `null` during SSR + first hydration for authed
 * users so we don't flash the landing on a returning visitor.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProgress, dueChars } from "@/store/progress";
import { useMounted } from "@/lib/useMounted";

export function SmartEntryGate({
  children,
  isAuthed,
}: {
  children: React.ReactNode;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const chars = useProgress((s) => s.chars);
  const completedLessons = useProgress((s) => s.completedLessons);
  const daily = useProgress((s) => s.daily);

  const hasProgress =
    Object.keys(chars).length > 0 ||
    completedLessons.length > 0 ||
    daily.length > 0;

  useEffect(() => {
    if (!mounted || !isAuthed || !hasProgress) return;
    const target = dueChars(chars).length > 0 ? "/review" : "/learn";
    router.replace(target);
  }, [mounted, isAuthed, hasProgress, chars, router]);

  // Guests → landing right away (no flicker, no SSR mismatch).
  if (!isAuthed) return <>{children}</>;

  // Authed: hide landing until we've checked progress on the client.
  if (!mounted) return null;

  // Authed + progress → redirect in effect; render nothing in the meantime.
  if (hasProgress) return null;

  // Authed + no progress → still useful to see the landing / onboarding.
  return <>{children}</>;
}

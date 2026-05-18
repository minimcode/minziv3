/**
 * Smart redirect for `/`:
 *   – Guests → marketing landing.
 *   – Authed users → sent straight into the app:
 *       1) due reviews exist → /review
 *       2) otherwise         → /learn
 *
 * Progress lives in localStorage (zustand persist) so the redirect target
 * is decided client-side. While the decision is being made we render
 * `null` to avoid flashing the marketing landing at a returning user.
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

  useEffect(() => {
    if (!mounted || !isAuthed) return;
    const target = dueChars(chars).length > 0 ? "/review" : "/learn";
    router.replace(target);
  }, [mounted, isAuthed, chars, router]);

  // Guests → landing right away (no flicker, no SSR mismatch).
  if (!isAuthed) return <>{children}</>;

  // Authed: redirect is firing in the effect — render nothing in the
  // meantime so the marketing page never flashes for a signed-in user.
  return null;
}

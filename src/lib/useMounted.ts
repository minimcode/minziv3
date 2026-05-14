"use client";

import { useSyncExternalStore } from "react";

/**
 * Returns `true` once mounted on the client. Uses `useSyncExternalStore` so
 * we don't trip the React 19 `set-state-in-effect` rule for the common
 * hydration-guard pattern around persisted (localStorage) state.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

function subscribe() {
  // No external source to subscribe to — the snapshot is static once mounted.
  return () => {};
}

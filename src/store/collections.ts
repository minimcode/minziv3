/**
 * Lightweight client-only store for user-curated "collections" of hanzi.
 *
 * Collections are personal memory shelves — a name, a calm cover image,
 * and an ordered list of hanzi the user has decided belong together.
 * Persisted to localStorage exactly like {@link useProgress}; nothing
 * server-side. Per Task 4 spec: no sharing, no nested folders, no
 * permissions, no backend tables.
 *
 * The store stays deliberately small: create / rename / setCover /
 * remove the collection, add/remove a hanzi (with multi-select), and a
 * `touchReviewed` call used by the Review session to record the last
 * time the collection was used. That's enough to drive both the
 * Collections page and the "Повторить коллекцию" entry point.
 */
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_COVER,
  type CoverId,
} from "@/components/collections/collectionCovers";

/**
 * Discriminated collection item. The store keeps hanzi and words in
 * separate string-arrays on disk (additive change — old persisted
 * shelves keep working without migration), but consumers can ask for
 * the unified view via {@link collectionItems}.
 *
 * `type` is forward-compat: the review engine isn't word-aware yet,
 * but every surface that lists collection contents will already get
 * tagged items so wiring word-SRS later is a renderer change, not a
 * data migration.
 */
export type CollectionItem =
  | { type: "hanzi"; value: string }
  | { type: "word"; value: string };

export interface Collection {
  id: string;
  name: string;
  coverId: CoverId;
  /** Single-character hanzi. Legacy field; still the primary surface. */
  hanzi: string[];
  /**
   * Multi-character HSK words. Optional so persisted v2 shelves stay
   * valid as-is; missing == empty.
   */
  words?: string[];
  createdAt: number;
  /** ms epoch of the last Review session that ran against this collection. */
  lastReviewedAt?: number;
}

interface State {
  collections: Collection[];

  /** Returns the new collection id. */
  createCollection: (name: string, coverId?: CoverId) => string;
  renameCollection: (id: string, name: string) => void;
  setCover: (id: string, coverId: CoverId) => void;
  deleteCollection: (id: string) => void;

  /** Adds `hanzi` (deduped) to every collection in `collectionIds`. */
  addHanziToCollections: (collectionIds: string[], hanzi: string[]) => void;
  removeHanzi: (collectionId: string, hanzi: string) => void;

  /** Word counterparts. Same shape so a future "Add to shelf" modal can
   *  call one or both depending on what's selected. */
  addWordsToCollections: (collectionIds: string[], words: string[]) => void;
  removeWord: (collectionId: string, word: string) => void;

  /** Records that the collection was just used for a review session. */
  touchReviewed: (id: string) => void;
}

function makeId(): string {
  // Random ID; no need for cryptographic strength — these never leave
  // the client. Falls back to a Math.random base when crypto is absent
  // (SSR-safe).
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

export const useCollections = create<State>()(
  persist(
    (set) => ({
      collections: [],

      createCollection: (name, coverId = DEFAULT_COVER) => {
        const id = makeId();
        set((s) => ({
          collections: [
            ...s.collections,
            {
              id,
              name: name.trim() || "Без названия",
              coverId,
              hanzi: [],
              words: [],
              createdAt: Date.now(),
            },
          ],
        }));
        return id;
      },

      renameCollection: (id, name) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, name: name.trim() || c.name } : c,
          ),
        })),

      setCover: (id, coverId) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, coverId } : c,
          ),
        })),

      deleteCollection: (id) =>
        set((s) => ({
          collections: s.collections.filter((c) => c.id !== id),
        })),

      addHanziToCollections: (collectionIds, hanzi) =>
        set((s) => {
          const ids = new Set(collectionIds);
          return {
            collections: s.collections.map((c) =>
              ids.has(c.id)
                ? { ...c, hanzi: uniq([...c.hanzi, ...hanzi]) }
                : c,
            ),
          };
        }),

      removeHanzi: (collectionId, hanzi) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? { ...c, hanzi: c.hanzi.filter((h) => h !== hanzi) }
              : c,
          ),
        })),

      addWordsToCollections: (collectionIds, words) =>
        set((s) => {
          const ids = new Set(collectionIds);
          return {
            collections: s.collections.map((c) =>
              ids.has(c.id)
                ? { ...c, words: uniq([...(c.words ?? []), ...words]) }
                : c,
            ),
          };
        }),

      removeWord: (collectionId, word) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? { ...c, words: (c.words ?? []).filter((w) => w !== word) }
              : c,
          ),
        })),

      touchReviewed: (id) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, lastReviewedAt: Date.now() } : c,
          ),
        })),
    }),
    { name: "minzi-collections-v2" },
  ),
);

/** Returns a collection by id, or undefined. SSR-safe — does not touch state. */
export function findCollection(
  collections: Collection[],
  id: string,
): Collection | undefined {
  return collections.find((c) => c.id === id);
}

/**
 * Unified tagged view over a collection's items. Renderers that want
 * to show hanzi and words side-by-side (eventual shelf detail page,
 * future review session) call this instead of inspecting the two
 * arrays directly.
 */
export function collectionItems(c: Collection): CollectionItem[] {
  const items: CollectionItem[] = [];
  for (const h of c.hanzi) items.push({ type: "hanzi", value: h });
  for (const w of c.words ?? []) items.push({ type: "word", value: w });
  return items;
}

/** Total item count across both hanzi and words. */
export function collectionItemCount(c: Collection): number {
  return c.hanzi.length + (c.words?.length ?? 0);
}

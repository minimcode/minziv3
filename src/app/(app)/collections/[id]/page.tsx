"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Pencil,
  PlayCircle,
  Trash2,
  X,
} from "lucide-react";
import { useCollections } from "@/store/collections";
import { useProgress } from "@/store/progress";
import {
  COVER_IDS,
  FAVORITES_COLLECTION_ID,
  type CoverId,
} from "@/components/collections/collectionCovers";
import {
  CollectionCover,
  coverLabel,
} from "@/components/collections/CollectionCover";
import { getChar, bestMeaning, pinyinOf } from "@/lib/characters";
import { useMounted } from "@/lib/useMounted";
import { cn } from "@/lib/cn";

/**
 * Detail page for a single collection.
 *
 * Renders the cover hero, count, rename / change-cover / delete
 * actions, the hanzi grid (with remove), and a "Повторить коллекцию"
 * call-to-action that navigates the review page into a collection
 * session (`?collection=<id>`).
 */
export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const mounted = useMounted();
  const isFavorites = id === FAVORITES_COLLECTION_ID;

  const userCollection = useCollections((s) =>
    s.collections.find((c) => c.id === id),
  );
  const renameCollection = useCollections((s) => s.renameCollection);
  const setCover = useCollections((s) => s.setCover);
  const deleteCollection = useCollections((s) => s.deleteCollection);
  const removeHanziFromCollection = useCollections((s) => s.removeHanzi);
  const chars = useProgress((s) => s.chars);
  const toggleFavorite = useProgress((s) => s.toggleFavorite);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startEditName = (current: string) => {
    setDraftName(current);
    setEditingName(true);
  };

  // System "Избранное" shelf: virtual collection backed by the
  // progress store's ⭐ flag. Cannot be renamed, re-covered, or
  // deleted — removing a hanzi simply toggles the favorite off.
  const favoritesHanzi = useMemo(() => {
    if (!isFavorites) return [];
    return Object.values(chars)
      .filter((c) => c.favorite)
      .sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0))
      .map((c) => c.hanzi);
  }, [chars, isFavorites]);

  const collection = isFavorites
    ? {
        id: FAVORITES_COLLECTION_ID,
        name: "Избранное",
        coverId: FAVORITES_COLLECTION_ID,
        hanzi: favoritesHanzi,
        createdAt: 0,
      }
    : userCollection;

  // Note: we deliberately defer the empty-state branch until after we
  // know the store is mounted. Otherwise the page flashes "not found"
  // on first render while Zustand re-hydrates from localStorage.
  if (mounted && !collection) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-display font-medium mb-2">
          Коллекция не найдена
        </h1>
        <Link
          href="/collections"
          className="text-sm text-[var(--foreground-muted)] inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> К коллекциям
        </Link>
      </div>
    );
  }

  if (!collection) {
    return null;
  }

  const removeHanzi = (collectionId: string, h: string) => {
    if (isFavorites) {
      toggleFavorite(h);
      return;
    }
    removeHanziFromCollection(collectionId, h);
  };

  const handleSaveName = () => {
    const name = draftName.trim();
    if (name && name !== collection.name) {
      renameCollection(collection.id, name);
    }
    setEditingName(false);
  };

  const handlePickCover = (cover: CoverId) => {
    setCover(collection.id, cover);
    setCoverPickerOpen(false);
  };

  const handleDelete = () => {
    deleteCollection(collection.id);
    router.push("/collections");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      <Link
        href="/collections"
        className="text-xs text-[var(--foreground-muted)] inline-flex items-center gap-1.5 mb-4 hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={12} /> Коллекции
      </Link>

      {/* Cover hero */}
      <div className="relative rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border)] mb-6">
        <div className="aspect-[16/6] sm:aspect-[16/5] max-h-72">
          <CollectionCover coverId={collection.coverId} collectionName={collection.name} />
        </div>
        {!isFavorites && (
          <button
            type="button"
            onClick={() => setCoverPickerOpen((v) => !v)}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)]/85 backdrop-blur-sm border border-[var(--border)] text-xs text-[var(--foreground)] hover:bg-[var(--surface)] shadow-sm"
          >
            Обложка <ChevronDown size={12} />
          </button>
        )}
        {isFavorites && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] bg-black/45 backdrop-blur-sm text-white/95 border border-white/15">
            Системная коллекция
          </span>
        )}
      </div>

      {/* Cover picker (inline) */}
      {!isFavorites && coverPickerOpen && (
        <div className="card p-4 mb-6 float-up">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2">
            Выберите обложку
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {COVER_IDS.map((cid) => (
              <button
                key={cid}
                type="button"
                onClick={() => handlePickCover(cid)}
                className={cn(
                  "rounded-lg overflow-hidden border-2 aspect-[8/5] transition-all",
                  collection.coverId === cid
                    ? "border-[var(--green)] shadow-sm"
                    : "border-transparent hover:border-[var(--border-strong)]",
                )}
                aria-label={coverLabel(cid)}
                title={coverLabel(cid)}
              >
                <CollectionCover coverId={cid} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") setEditingName(false);
              }}
              autoFocus
              className="w-full text-2xl sm:text-3xl font-display font-medium bg-transparent border-b border-[var(--green)] focus:outline-none"
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-display font-medium truncate">
              {collection.name}
              {!isFavorites && (
                <button
                  type="button"
                  onClick={() => startEditName(collection.name)}
                  className="ml-2 align-middle text-[var(--foreground-soft)] hover:text-[var(--foreground)]"
                  aria-label="Переименовать"
                >
                  <Pencil size={14} />
                </button>
              )}
            </h1>
          )}
          <p className="text-sm text-[var(--foreground-muted)] mt-1 tabular-nums">
            {collection.hanzi.length}{" "}
            {collection.hanzi.length === 1 ? "иероглиф" : "иероглифов"}
            {isFavorites && (
              <span className="ml-2 text-[var(--foreground-soft)] not-italic">
                · обновляется автоматически из ⭐ в словаре
              </span>
            )}
          </p>
        </div>
        {!isFavorites && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn btn-ghost text-sm text-[var(--red)] hover:bg-[var(--red-soft)] h-10"
            aria-label="Удалить коллекцию"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Удалить</span>
          </button>
        )}
      </div>

      {/* Review CTA */}
      {collection.hanzi.length > 0 && (
        <Link
          href={`/review?collection=${encodeURIComponent(collection.id)}`}
          className="btn btn-primary inline-flex w-full sm:w-auto h-11 mb-6"
        >
          <PlayCircle size={16} />
          Повторить коллекцию
        </Link>
      )}

      {/* Hanzi grid */}
      {collection.hanzi.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--foreground-muted)]">
          {isFavorites
            ? "В Избранном пока пусто. Нажмите ⭐ рядом с иероглифом в словаре — и он появится здесь."
            : "В этой коллекции пока нет иероглифов. Добавьте их из словаря, подробной страницы иероглифа или из повторений — нажмите «Добавить в коллекцию»."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {collection.hanzi.map((h) => {
            const c = getChar(h);
            const pinyin = pinyinOf(h);
            const meaning = c ? bestMeaning(c) : "";
            return (
              <div
                key={h}
                className="group card-soft p-3 flex items-center gap-3 hover:shadow-md transition-all"
              >
                <Link
                  href={`/hanzi/${encodeURIComponent(h)}?from=${encodeURIComponent(`/collections/${collection.id}`)}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <span className="hanzi text-3xl w-10 text-center shrink-0">
                    {h}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="pinyin text-xs text-[var(--foreground-muted)] truncate">
                      {pinyin || "—"}
                    </div>
                    <div className="text-sm font-medium truncate">
                      {meaning || "—"}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => removeHanzi(collection.id, h)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--foreground-soft)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors shrink-0"
                  aria-label={isFavorites ? `Убрать ${h} из избранного` : `Удалить ${h} из коллекции`}
                  title={isFavorites ? "Убрать из избранного" : "Удалить из коллекции"}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {!isFavorites && confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmDelete(false)}
            aria-hidden="true"
          />
          <div className="relative card p-6 max-w-sm w-full">
            <h2 className="text-lg font-display font-medium mb-2">
              Удалить коллекцию?
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] mb-5">
              Коллекция «{collection.name}» будет удалена.
              Иероглифы из неё останутся в словаре — удалится только сама
              полка.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn btn-ghost text-sm flex-1 h-11"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn text-sm flex-1 h-11 bg-[var(--red)] text-white hover:bg-[var(--red-deep)]"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

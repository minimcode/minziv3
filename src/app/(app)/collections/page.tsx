"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, FolderPlus, Layers, Plus, Star, X } from "lucide-react";
import { useCollections } from "@/store/collections";
import { useProgress } from "@/store/progress";
import {
  COVER_IDS,
  DEFAULT_COVER,
  FAVORITES_COLLECTION_ID,
  type CoverId,
} from "@/components/collections/collectionCovers";
import { CollectionCover, coverLabel } from "@/components/collections/CollectionCover";
import { useMounted } from "@/lib/useMounted";
import { cn } from "@/lib/cn";

/**
 * Collections — "memory shelves" page.
 *
 * Compact hero, a single floating "+" CTA, and cards where text sits on top
 * of the cover artwork with a gradient overlay. The first card is the
 * system "Избранное" shelf — virtual, driven by the ⭐ flag in the
 * progress store. It always renders first, cannot be deleted from here,
 * and shows its dedicated favorites cover (Task: UI polish §1, §2, §3,
 * §4, §5, §8).
 */
interface ShelfItem {
  id: string;
  name: string;
  coverId: string;
  hanziCount: number;
  lastActiveAt?: number;
  href: string;
  variant: "favorites" | "user";
}

export default function CollectionsPage() {
  const collections = useCollections((s) => s.collections);
  const createCollection = useCollections((s) => s.createCollection);
  const chars = useProgress((s) => s.chars);
  const mounted = useMounted();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCover, setNewCover] = useState<CoverId>(DEFAULT_COVER);

  // Favorites is a virtual collection: count + freshness come straight
  // from the progress store, so adding a ⭐ in the dictionary
  // instantly updates this card without any cross-store wiring.
  const { favoritesCount, favoritesLastSeen } = useMemo(() => {
    let count = 0;
    let last = 0;
    for (const c of Object.values(chars)) {
      if (!c.favorite) continue;
      count += 1;
      if (c.lastSeen && c.lastSeen > last) last = c.lastSeen;
    }
    return { favoritesCount: count, favoritesLastSeen: last || undefined };
  }, [chars]);

  const shelves = useMemo<ShelfItem[]>(() => {
    const ordered = [...collections]
      .filter((c) => c.id !== FAVORITES_COLLECTION_ID)
      .sort((a, b) => {
        const aT = a.lastReviewedAt ?? a.createdAt;
        const bT = b.lastReviewedAt ?? b.createdAt;
        return bT - aT;
      });
    return [
      {
        id: FAVORITES_COLLECTION_ID,
        name: "Избранное",
        coverId: FAVORITES_COLLECTION_ID,
        hanziCount: favoritesCount,
        lastActiveAt: favoritesLastSeen,
        href: `/collections/${FAVORITES_COLLECTION_ID}`,
        variant: "favorites" as const,
      },
      ...ordered.map((c) => ({
        id: c.id,
        name: c.name,
        coverId: c.coverId,
        hanziCount: c.hanzi.length,
        lastActiveAt: c.lastReviewedAt,
        href: `/collections/${c.id}`,
        variant: "user" as const,
      })),
    ];
  }, [collections, favoritesCount, favoritesLastSeen]);

  useEffect(() => {
    if (!creating) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreating(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createCollection(name, newCover);
    setNewName("");
    setNewCover(DEFAULT_COVER);
    setCreating(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 sm:py-8 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      {/* Compact hero */}
      <header className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[var(--green-soft)] flex items-center justify-center shrink-0 mt-0.5">
            <Layers size={18} className="text-[var(--green-deep)]" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h1 className="text-2xl sm:text-3xl font-display font-medium leading-tight">
              Коллекции
            </h1>
            <p className="text-xs sm:text-sm text-[var(--foreground-muted)] mt-1 leading-snug max-w-md line-clamp-2">
              Полки памяти — собирайте иероглифы по темам и возвращайтесь к ним без спешки.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          aria-label={creating ? "Закрыть форму" : "Создать коллекцию"}
          aria-expanded={creating}
          className={cn(
            "shelf-fab shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all",
            "bg-[var(--surface)] border border-[color:rgba(196,58,58,0.28)] text-[var(--red)]",
            "shadow-[0_6px_18px_-10px_rgba(196,58,58,0.55)]",
            "hover:shadow-[0_10px_24px_-12px_rgba(196,58,58,0.65)] hover:text-[var(--red-deep)]",
            "active:scale-[0.96]",
            creating && "bg-[var(--red-soft)]",
          )}
        >
          {creating ? <X size={18} /> : <Plus size={20} strokeWidth={2.2} />}
        </button>
      </header>

      {/* Inline create form */}
      {creating && (
        <div className="card p-4 sm:p-5 mb-4 sm:mb-5 float-up">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-1.5">
            Новая полка
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Например: «Из дневника», «На выходные»"
            autoFocus
            className="w-full text-base bg-transparent border-b border-[var(--border)] focus:outline-none focus:border-[var(--green)] py-1.5 mb-4"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />

          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-1.5">
            Обложка
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-4">
            {COVER_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setNewCover(id)}
                className={cn(
                  "rounded-lg overflow-hidden border-2 aspect-[16/9] transition-all",
                  newCover === id
                    ? "border-[var(--green)] shadow-sm"
                    : "border-transparent hover:border-[var(--border-strong)]",
                )}
                title={coverLabel(id)}
                aria-label={coverLabel(id)}
              >
                <CollectionCover coverId={id} />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="btn btn-primary text-sm h-10 w-full sm:w-auto"
          >
            <FolderPlus size={14} />
            Создать
          </button>
        </div>
      )}

      {/* Shelves grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {(!mounted ? [shelves[0]] : shelves).map((s) => (
          <ShelfCard key={s.id} shelf={s} />
        ))}
        {mounted && collections.length === 0 && !creating && (
          <EmptyHint onCreate={() => setCreating(true)} />
        )}
      </div>
    </div>
  );
}

function ShelfCard({ shelf }: { shelf: ShelfItem }) {
  const isFavorites = shelf.variant === "favorites";
  return (
    <Link
      href={shelf.href}
      className={cn(
        "shelf-card group relative block overflow-hidden rounded-2xl border focus:outline-none focus:ring-2 focus:ring-[var(--green)]/35 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgba(20,22,18,0.45)]",
        "active:scale-[0.995]",
        isFavorites
          ? "border-[color:rgba(196,58,58,0.32)] ring-1 ring-[color:rgba(196,58,58,0.14)] shadow-[0_8px_24px_-16px_rgba(196,58,58,0.5)]"
          : "border-[var(--border)] shadow-[0_4px_14px_-12px_rgba(20,22,18,0.35)]",
      )}
    >
      {/* Favorites stays at the hero-ish 16:9 ratio so it keeps its
         "shelf" feel; user collections are roughly half the height
         (≈32:9) — a quieter row that lets the favorites card breathe
         on top. */}
      <div className={cn("relative", isFavorites ? "aspect-[16/9]" : "aspect-[32/9]")}>
        <CollectionCover
          coverId={shelf.coverId}
          collectionName={shelf.name}
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Soft top vignette so the badge keeps contrast on bright skies */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/40 via-black/10 to-transparent pointer-events-none"
        />

        {/* Bottom gradient so the text reads as part of the artwork */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none"
        />

        {/* Favorites star badge */}
        {isFavorites && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] bg-black/45 backdrop-blur-sm text-white/95 border border-white/15">
            <Star size={11} fill="currentColor" className="text-[#f1c66b]" />
            Избранное
          </span>
        )}

        {/* Text overlay. Compact layout on regular shelves: name +
           one-line metadata sit on a single row to match the slimmer
           aspect ratio. Favorites keeps the airier stacked layout. */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 text-white",
            isFavorites ? "p-4 sm:p-5" : "px-4 sm:px-5 py-3 sm:py-3.5",
          )}
        >
          {isFavorites ? (
            <>
              <h3 className="text-2xl font-display font-medium truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                {shelf.name}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-white/85">
                <span className="tabular-nums">
                  {shelf.hanziCount} {pluralChars(shelf.hanziCount)}
                </span>
                {shelf.lastActiveAt && (
                  <>
                    <span className="opacity-60">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} />
                      Последний повтор {formatAgo(shelf.lastActiveAt)}
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-display font-medium truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]">
                  {shelf.name}
                </h3>
                <div className="mt-0.5 text-[11px] text-white/80 truncate">
                  <span className="tabular-nums">
                    {shelf.hanziCount} {pluralChars(shelf.hanziCount)}
                  </span>
                  {shelf.lastActiveAt && (
                    <>
                      <span className="opacity-60 mx-1.5">·</span>
                      <span>{formatAgo(shelf.lastActiveAt)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyHint({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="rounded-2xl border border-dashed border-[var(--border-strong)] aspect-[32/9] flex flex-col items-center justify-center text-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--green)]/50 hover:bg-[var(--surface)] transition-all px-4"
    >
      <FolderPlus size={20} className="mb-1.5 opacity-80" />
      <span className="text-sm font-medium">Создать первую полку</span>
      <span className="text-xs text-[var(--foreground-soft)] mt-0.5 px-4">
        Например, «Любимые» или «Из дневника»
      </span>
    </button>
  );
}

function pluralChars(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return "иероглифов";
  if (mod10 === 1) return "иероглиф";
  if (mod10 >= 2 && mod10 <= 4) return "иероглифа";
  return "иероглифов";
}

function formatAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "только что";
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(diff / 3_600_000);
  if (h < 24) return `${h} ч назад`;
  const d = Math.round(diff / 86_400_000);
  if (d < 2) return "вчера";
  if (d < 7) return `${d} дн назад`;
  return `${Math.round(d / 7)} нед назад`;
}

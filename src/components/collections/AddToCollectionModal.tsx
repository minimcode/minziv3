"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, FolderPlus, X } from "lucide-react";
import { useCollections } from "@/store/collections";
import {
  COVER_IDS,
  DEFAULT_COVER,
  type CoverId,
} from "@/components/collections/collectionCovers";
import { CollectionCover, coverLabel } from "./CollectionCover";
import { cn } from "@/lib/cn";

/**
 * Add-to-collection modal.
 *
 * Used from dictionary / hanzi / review surfaces. Opens a calm
 * bottom-sheet on mobile and a centered modal on desktop, listing every
 * existing collection with a checkbox and offering a single-step
 * "Create a new collection" affordance below.
 *
 * The modal is purely a `Save` form: it mutates the Zustand store on
 * commit and never persists draft state.  No backend round-trip.
 */
interface Props {
  /** When `null` the modal is closed; pass an array of hanzi to open it. */
  hanzi: string[] | null;
  onClose: () => void;
}

/**
 * Outer wrapper. Conditionally mounts `ModalContent` keyed on the hanzi
 * target so every open gets a fresh state set without an in-effect
 * setState reset.
 */
export function AddToCollectionModal({ hanzi, onClose }: Props) {
  if (hanzi === null) return null;
  return (
    <ModalContent
      key={hanzi.join("·") || "empty"}
      hanzi={hanzi}
      onClose={onClose}
    />
  );
}

function ModalContent({
  hanzi,
  onClose,
}: {
  hanzi: string[];
  onClose: () => void;
}) {
  const collections = useCollections((s) => s.collections);
  const addHanziToCollections = useCollections((s) => s.addHanziToCollections);
  const createCollection = useCollections((s) => s.createCollection);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [newName, setNewName] = useState("");
  const [newCover, setNewCover] = useState<CoverId>(DEFAULT_COVER);
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState(false);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on ESC.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hanziLabel = useMemo(() => {
    if (hanzi.length === 0) return "";
    if (hanzi.length === 1) return hanzi[0];
    return `${hanzi.slice(0, 4).join(" · ")}${hanzi.length > 4 ? " …" : ""}`;
  }, [hanzi]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    let ids = Array.from(selected);
    const name = newName.trim();
    if (name) {
      const newId = createCollection(name, newCover);
      ids = [...ids, newId];
    }
    if (ids.length === 0) return;
    addHanziToCollections(ids, hanzi);
    setSaved(true);
    // Close shortly after — gives the user visual confirmation without
    // blocking the surface they came from.
    window.setTimeout(() => {
      onClose();
    }, 600);
  };

  const canSave =
    selected.size > 0 || newName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-md sm:mx-4 max-h-[90vh] overflow-y-auto bg-[var(--surface)] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-[var(--border)] float-up">
        {/* drag handle on mobile */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-[var(--border)] mx-auto mt-3" />

        <div className="flex items-start justify-between px-5 sm:px-6 pt-4 sm:pt-6 pb-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
              {hanzi.length > 1
                ? `Добавить ${hanzi.length} иероглифа`
                : "Добавить в коллекцию"}
            </div>
            <h2 className="text-lg font-display font-medium mt-0.5">
              <span className="hanzi text-2xl mr-2 align-middle">{hanziLabel}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 sm:px-6 pb-6 space-y-4">
          {/* Existing collections */}
          {collections.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] px-1">
                Ваши коллекции
              </div>
              <ul className="space-y-1.5">
                {collections.map((c) => {
                  const isSelected = selected.has(c.id);
                  const already = c.hanzi.some((h) => hanzi.includes(h));
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggleSelected(c.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-[var(--green)] bg-[var(--green-soft)]"
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--green)]/40 hover:shadow-sm",
                        )}
                      >
                        <div className="w-12 h-8 rounded-md overflow-hidden border border-[var(--border)] shrink-0">
                          <CollectionCover coverId={c.coverId} collectionName={c.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-[var(--foreground-soft)] tabular-nums">
                            {c.hanzi.length}{" "}
                            {c.hanzi.length === 1 ? "иероглиф" : "иероглифов"}
                            {already && " · уже есть"}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center",
                            isSelected
                              ? "bg-[var(--green)] border-[var(--green)] text-white"
                              : "border-[var(--border-strong)] text-transparent",
                          )}
                        >
                          <Check size={12} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)] py-2">
              У вас пока нет коллекций. Создайте первую — например,
              «Любимые», «Из словаря», «На выходные».
            </p>
          )}

          {/* New collection */}
          {!creating ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[var(--border-strong)] text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--green)]/40 hover:bg-[var(--surface)] transition-all"
            >
              <FolderPlus size={14} />
              Создать новую коллекцию
            </button>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Название коллекции"
                autoFocus
                className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20 focus:border-[var(--green)]"
              />
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-1.5">
                  Обложка
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {COVER_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setNewCover(id)}
                      className={cn(
                        "rounded-md overflow-hidden border-2 aspect-[8/5] transition-all",
                        newCover === id
                          ? "border-[var(--green)] shadow-sm"
                          : "border-transparent hover:border-[var(--border-strong)]",
                      )}
                      aria-label={coverLabel(id)}
                      title={coverLabel(id)}
                    >
                      <CollectionCover coverId={id} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save / cancel */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1 h-11 text-sm"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saved}
              className={cn(
                "btn flex-1 h-11 text-sm",
                saved ? "btn-success" : "btn-primary",
              )}
            >
              {saved ? "Готово" : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

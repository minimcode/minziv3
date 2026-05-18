"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  GraduationCap,
  Repeat,
  Book,
  User,
  Layers,
  Leaf,
  PenTool,
  BarChart3,
  Menu,
  X,
} from "lucide-react";

/* Primary mobile tabs — kept to four to avoid the squished / clipped
   labels we saw with six. The fifth slot is reserved for the "Ещё"
   sheet, which holds the secondary destinations (Полки, Графемы,
   Статистика, Профиль). Sidebar on desktop still lists everything. */
const PRIMARY = [
  { href: "/learn", label: "Учить", icon: GraduationCap },
  { href: "/review", label: "Повтор", icon: Repeat },
  { href: "/garden", label: "Сад", icon: Leaf },
  { href: "/dictionary", label: "Словарь", icon: Book },
] as const;

const MORE = [
  { href: "/collections", label: "Полки", icon: Layers },
  { href: "/graphemes", label: "Графемы", icon: PenTool },
  { href: "/stats", label: "Статистика", icon: BarChart3 },
  { href: "/profile", label: "Профиль", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the sheet whenever the route changes — intentional one-shot
  // transition on an external param (pathname) so the menu doesn't
  // linger after navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close menu on route change
    setMoreOpen(false);
  }, [pathname]);

  // ESC closes the sheet.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  const moreActive = MORE.some(({ href }) => isActive(href));

  return (
    <>
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-30" role="presentation">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="menu"
            aria-label="Ещё"
            className="absolute left-3 right-3 bottom-[calc(64px+env(safe-area-inset-bottom))] rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl overflow-hidden float-up"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
                Ещё
              </span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Закрыть"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-2)]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {MORE.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm",
                      active
                        ? "bg-[var(--green-soft)] text-[var(--green-deep)] font-medium"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                    )}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[var(--surface)]/95 backdrop-blur border-t border-[var(--border)] flex items-stretch z-40 pb-[env(safe-area-inset-bottom)]">
        {PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 min-w-0 flex flex-col items-center gap-1 py-2.5 px-1 text-[10px] leading-tight",
                active
                  ? "text-[var(--green-deep)]"
                  : "text-[var(--foreground-muted)]",
              )}
            >
              <Icon size={18} />
              <span className="truncate w-full text-center">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          aria-label="Ещё"
          className={cn(
            "flex-1 min-w-0 flex flex-col items-center gap-1 py-2.5 px-1 text-[10px] leading-tight transition-colors",
            moreOpen || moreActive
              ? "text-[var(--green-deep)]"
              : "text-[var(--foreground-muted)]",
          )}
        >
          <Menu size={18} />
          <span className="truncate w-full text-center">Ещё</span>
        </button>
      </nav>
    </>
  );
}

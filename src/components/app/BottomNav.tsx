"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { GraduationCap, Repeat, Book, User, PenTool } from "lucide-react";

const NAV = [
  { href: "/learn", label: "Учить", icon: GraduationCap },
  { href: "/review", label: "Повтор", icon: Repeat },
  { href: "/dictionary", label: "Словарь", icon: Book },
  { href: "/graphemes", label: "Графемы", icon: PenTool },
  { href: "/profile", label: "Профиль", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[var(--surface)]/95 backdrop-blur border-t border-[var(--border)] flex items-stretch z-30 pb-[env(safe-area-inset-bottom)]">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px]",
              active
                ? "text-[var(--green-deep)]"
                : "text-[var(--foreground-muted)]"
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

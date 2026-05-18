"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  GraduationCap,
  Repeat,
  Book,
  BarChart3,
  User,
  Settings,
  Leaf,
  PenTool,
  Layers,
} from "lucide-react";
import Image from "next/image";
import { ProgressBar } from "@/components/ui/Progress";
import { StreakDots } from "@/components/ui/StreakDots";
import { useProgress } from "@/store/progress";
import { useMounted } from "@/lib/useMounted";

const NAV = [
  { href: "/learn", label: "Учиться", icon: GraduationCap },
  { href: "/review", label: "Повторение", icon: Repeat },
  { href: "/garden", label: "Сад", icon: Leaf },
  { href: "/dictionary", label: "Словарь", icon: Book },
  { href: "/collections", label: "Коллекции", icon: Layers },
  { href: "/graphemes", label: "Графемы", icon: PenTool },
  { href: "/stats", label: "Статистика", icon: BarChart3 },
  { href: "/profile", label: "Профиль", icon: User },
] as const;

const DAILY_GOAL_MIN = 20;

export function Sidebar() {
  const pathname = usePathname();
  const daily = useProgress((s) => s.daily);
  const mounted = useMounted();

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = daily.find((d) => d.date === today);
  // Rough estimate: ~30s per reviewed item.
  const dailyMin = todayEntry ? Math.round((todayEntry.reviewed * 30) / 60) : 0;

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm sticky top-0 h-screen p-5 gap-4">
      <Link href="/" className="flex items-center gap-2.5 px-1">
        <Image src="/icon.svg" alt="" width={36} height={36} priority />
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-display font-semibold tracking-tight">
            Minzi
          </span>
          <span className="text-[11px] text-[var(--foreground-muted)] tracking-wide">
            китайский · письмо · память
          </span>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-colors",
                active
                  ? "bg-[var(--green-soft)] text-[var(--green-deep)] font-medium"
                  : "text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {/* Small panda flair */}
        <div className="flex justify-center -mb-2 pointer-events-none">
          <Image
            src="/panda/reading_for_web.png"
            alt=""
            width={140}
            height={140}
            className="select-none"
          />
        </div>

        {/* Continuity block — last 30 days as ink dots, no number shown. */}
        <div className="rounded-[14px] bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2">
            Непрерывность
          </div>
          <StreakDots daily={mounted ? daily : []} days={30} columns={15} />
        </div>

        {/* Daily goal */}
        <div className="rounded-[14px] bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-1">
            Цель на день
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-sm font-medium tabular-nums">
              {mounted ? dailyMin : 0}
            </span>
            <span className="text-xs text-[var(--foreground-muted)] tabular-nums whitespace-nowrap">
              /&nbsp;{DAILY_GOAL_MIN}&nbsp;мин
            </span>
          </div>
          <ProgressBar value={dailyMin} max={DAILY_GOAL_MIN} />
        </div>

        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors"
        >
          <Settings size={16} /> Настройки
        </Link>
      </div>
    </aside>
  );
}

// kept for potential future use; currently unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

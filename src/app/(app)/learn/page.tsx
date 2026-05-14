"use client";

import Link from "next/link";
import { useState } from "react";
import { getLessonsByLevel, type Lesson } from "@/lib/characters";
import { useProgress } from "@/store/progress";
import { useMounted } from "@/lib/useMounted";
import { Panda } from "@/components/ui/Panda";
import { ProgressBar } from "@/components/ui/Progress";
import { Lock, Check, ChevronRight, BookOpen, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

const LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;
export default function LearnPage() {
  const [level, setLevel] = useState<number>(1);
  const completed = useProgress((s) => s.completedLessons);
  const mounted = useMounted();

  const levelLessons = getLessonsByLevel(level);
  const totalCharsInLevel = levelLessons.reduce((s, l) => s + l.characters.length, 0);
  const levelCompletedIds = mounted ? completed.filter((id) => id.startsWith(`hsk${level}-`)) : [];
  const completedCount = levelCompletedIds.length;
  const completedCharsCount = mounted
    ? levelLessons.filter((l) => completed.includes(l.id)).reduce((s, l) => s + l.characters.length, 0)
    : 0;
  const totalLessons = levelLessons.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      {/* Page header */}
      <header className="flex items-start justify-between gap-4 mb-6 sm:mb-8 min-h-[120px]">
        <div className="flex-1 min-w-0 pt-2">
          <h1 className="text-3xl sm:text-4xl font-display font-medium leading-tight">
            HSK {level} · Уроки
          </h1>
          <p className="text-[var(--foreground-muted)] mt-2 max-w-md leading-snug">
            Изучите {totalCharsInLevel} иероглифов уровня HSK&nbsp;{level}
          </p>
        </div>
        <div className="hidden sm:block shrink-0 -mt-2 -mr-2">
          <Panda mood="learning" size={160} priority />
        </div>
      </header>

      {/* Progress card */}
      <div className="card p-5 sm:p-6 mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2">
            Ваш прогресс
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-sans font-bold text-[var(--green-deep)] tabular-nums">
              {completedCharsCount}
            </span>
            <span className="text-lg text-[var(--foreground-muted)] tabular-nums">
              / {totalCharsInLevel}
            </span>
          </div>
          <ProgressBar
            value={completedCharsCount}
            max={totalCharsInLevel}
            className="mt-3"
          />
        </div>
        <div className="sm:border-l sm:border-[var(--border)] sm:pl-6">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2">
            Уроков пройдено
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-sans font-bold text-[var(--green-deep)] tabular-nums">
              {completedCount}
            </span>
            <span className="text-lg text-[var(--foreground-muted)] tabular-nums">
              / {totalLessons}
            </span>
          </div>
        </div>
        <div className="sm:border-l sm:border-[var(--border)] sm:pl-6">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)] mb-2">
            Иероглифов изучено
          </div>
          <div className="text-3xl sm:text-4xl font-sans font-bold text-[var(--green-deep)] tabular-nums">
            {completedCharsCount}
          </div>
        </div>
      </div>

      {/* HSK level tabs */}
      <div className="flex items-end gap-1 sm:gap-2 mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-[var(--border)]">
        {LEVELS.map((lvl) => {
          const active = lvl === level;
          return (
            <button
              key={lvl}
              onClick={() => setLevel(lvl)}
              className={cn(
                "px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative -mb-px",
                active
                  ? "text-[var(--green-deep)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              )}
            >
              HSK {lvl}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-[2px] bg-[var(--green-deep)] rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Lesson list */}
      <div className="divide-y divide-[var(--border)]" role="list">
        {levelLessons.map((lesson, i) => {
          const isDone = mounted && completed.includes(lesson.id);
          const isCurrent =
            mounted && !isDone && i === completedCount;
          const isLocked = !isDone && !isCurrent;
          return (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              isDone={isDone}
              isCurrent={isCurrent}
              isLocked={isLocked}
            />
          );
        })}
      </div>

      {/* Bottom CTA banner */}
      <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--green-soft)] bg-[var(--bamboo-soft)] p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-white border border-[var(--border)] items-center justify-center shrink-0">
          <BookOpen size={26} className="text-[var(--green-deep)]" />
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="font-display text-lg sm:text-xl text-[var(--foreground)] mb-1">
            Что дальше?
          </div>
          <p className="text-sm text-[var(--foreground-muted)] leading-snug">
            Продолжайте учиться и не забывайте повторять изученное в разделе
            «Повторение».
          </p>
        </div>
        <Link
          href="/review"
          className="btn btn-primary whitespace-nowrap"
          style={{ background: "var(--green)" }}
        >
          К повторению <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  isDone,
  isCurrent,
  isLocked,
}: {
  lesson: Lesson;
  isDone: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}) {
  const lessonNumber = lesson.index + 1;

  const node = isDone ? (
    <span className="w-10 h-10 rounded-full bg-[var(--green)] text-white flex items-center justify-center shadow-sm shrink-0">
      <Check size={18} strokeWidth={3} />
    </span>
  ) : isCurrent ? (
    <span className="w-10 h-10 rounded-full bg-[var(--green-deep)] text-white flex items-center justify-center font-medium tabular-nums shadow-sm shrink-0">
      {lessonNumber}
    </span>
  ) : (
    <span className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground-soft)] flex items-center justify-center text-sm tabular-nums shrink-0">
      {lessonNumber}
    </span>
  );

  const content = (
    <>
      {node}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold italic text-[var(--foreground)] mb-0.5">
          Урок {lessonNumber}{lesson.title ? ` · ${lesson.title}` : ""}
        </div>
        {lesson.theme && (
          <div className="text-[11px] text-[var(--foreground-soft)] mb-1">
            {lesson.theme}
          </div>
        )}
        <div className="hanzi text-lg sm:text-xl tracking-[0.25em] text-[var(--foreground)] leading-tight">
          {lesson.characters.join("\u2003")}
        </div>
        <div className="text-xs text-[var(--foreground-muted)] mt-1">
          {lesson.characters.length} иероглифов
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {isDone && <DoneBadge />}
        {isCurrent && (
          <span className="btn btn-primary h-10 px-5 text-sm whitespace-nowrap">
            Продолжить
          </span>
        )}
        {isLocked && (
          <span
            className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-soft)]"
            aria-label="Закрыто"
          >
            <Lock size={16} />
          </span>
        )}
        {!isLocked && (
          <ChevronRight
            size={18}
            className="shrink-0 text-[var(--foreground-muted)]"
          />
        )}
      </div>
    </>
  );

  const rowBase =
    "flex items-center gap-4 sm:gap-5 px-2 sm:px-3 py-4 sm:py-5 transition-colors";

  if (isCurrent) {
    return (
      <Link
        href={`/learn/${lesson.id}`}
        className={cn(
          rowBase,
          "rounded-2xl bg-[var(--bamboo-soft)] border border-[var(--green-soft)] -mx-3 px-5 sm:-mx-4 sm:px-7 my-1 group focus:outline-none"
        )}
      >
        {content}
      </Link>
    );
  }

  if (isDone) {
    return (
      <Link
        href={`/learn/${lesson.id}`}
        className={cn(rowBase, "group hover:bg-[var(--surface-2)] focus:outline-none")}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(rowBase, "cursor-not-allowed opacity-75")}
      aria-disabled="true"
    >
      {content}
    </div>
  );
}

function DoneBadge() {
  return (
    <div className="hidden sm:flex items-center gap-2">
      <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--green-soft)] text-[var(--green-deep)] font-medium whitespace-nowrap">
        Пройдено
      </span>
      <span
        className="w-10 h-10 rounded-full border-[2.5px] border-[var(--green)] text-[var(--green-deep)] flex items-center justify-center text-[10px] font-medium tabular-nums"
        aria-label="100%"
      >
        100%
      </span>
    </div>
  );
}

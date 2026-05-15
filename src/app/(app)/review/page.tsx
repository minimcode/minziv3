"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useProgress, dueChars, type Outcome, type CharProgress, type DailyEntry } from "@/store/progress";
import { useViewportWidth } from "@/lib/useViewport";
import { getChar, meaningRu, meaningShort, ALL_CHARACTERS, type CharRecord } from "@/lib/characters";
import { Card } from "@/components/ui/Card";
import { Panda } from "@/components/ui/Panda";
import { WritingQuiz } from "@/components/learn/WritingQuiz";
import { StrokeAnimation } from "@/components/learn/StrokeAnimation";
import { SwipeStack } from "@/components/learn/SwipeStack";
import {
  Volume2, RotateCcw, Eye, ChevronRight, ChevronDown,
  BookOpen, PenTool, Brain, Zap, Star,
  ArrowRight, Clock, SkipForward,
  HelpCircle, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/cn";

/* ─── Types ─────────────────────────────────────────────────────────── */

type SessionPhase =
  | "idle"        // dashboard
  | "warmup"      // quick recognition swipes
  | "recognition" // multiple choice quiz
  | "writing"     // writing review with HanziWriter
  | "context"     // fill-in-the-blank sentences
  | "srs"         // SRS rating after writing+context
  | "summary";    // session results

interface SessionStats {
  total: number;
  correct: number;
  written: number;
  recognized: number;
  contextCorrect: number;
  startTime: number;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

const speak = (text: string) => {
  if (typeof window === "undefined") return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 0.8;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
};

const today = () => new Date().toISOString().slice(0, 10);

function pluralChars(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "иероглиф";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "иероглифа";
  return "иероглифов";
}

/** Format a duration in milliseconds as a short Russian phrase like
 *  "через 3 ч" or "через 2 дн". Used for the SRS "next review" hint. */
function formatRelativeIn(ms: number): string {
  if (ms <= 0) return "сейчас";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) {
    if (minutes < 1) return "сейчас";
    return `через ${minutes} мин`;
  }
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return `через ${hours} ч`;
  const days = Math.round(ms / 86_400_000);
  return `через ${days} дн`;
}

// Deterministic seed from a string — used to keep quiz option ordering
// stable across re-renders (react-hooks/purity).
function stringSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stableShuffle<T>(xs: T[], seed: number): T[] {
  let s = (seed >>> 0) || 1;
  return xs
    .map((x, i) => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return { x, k: (s + i * 9301) >>> 0 };
    })
    .sort((a, b) => a.k - b.k)
    .map((p) => p.x);
}

/* Context sentence templates */
const SENTENCE_DB: { template: string; answer: string; meaning: string }[] = [
  { template: "___好", answer: "你", meaning: "Привет (ты + хорошо)" },
  { template: "___是学生", answer: "我", meaning: "Я студент" },
  { template: "这___一本书", answer: "是", meaning: "Это книга" },
  { template: "___的名字", answer: "你", meaning: "Твоё имя" },
  { template: "___不知道", answer: "我", meaning: "Я не знаю" },
  { template: "___们好", answer: "你", meaning: "Здравствуйте (вы + хорошо)" },
  { template: "___有一个朋友", answer: "我", meaning: "У меня есть друг" },
  { template: "他___老师", answer: "是", meaning: "Он учитель" },
  { template: "___叫什么", answer: "你", meaning: "Как тебя зовут" },
  { template: "___很高兴", answer: "我", meaning: "Я очень рад" },
  { template: "___认识你", answer: "很", meaning: "Очень рад знакомству" },
  { template: "___会说中文", answer: "我", meaning: "Я умею говорить по-китайски" },
  { template: "___想学习", answer: "我", meaning: "Я хочу учиться" },
  { template: "今天天气___好", answer: "很", meaning: "Сегодня погода очень хорошая" },
];

/* ─── Heatmap ───────────────────────────────────────────────────────── */

function ReviewHeatmap({ daily }: { daily: DailyEntry[] }) {
  const weeks = 7;
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const now = new Date();

  const cells: { date: string; count: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - (w * 7 + (6 - d)));
      const key = dt.toISOString().slice(0, 10);
      const entry = daily.find((e) => e.date === key);
      cells.push({ date: key, count: entry?.reviewed ?? 0 });
    }
  }

  const maxCount = Math.max(1, ...cells.map((c) => c.count));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map((d) => (
          <span key={d} className="text-[10px] text-center text-[var(--foreground-soft)]">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const intensity = c.count / maxCount;
          const bg = c.count === 0
            ? "bg-[var(--surface-3)]"
            : intensity < 0.3
            ? "bg-[#c8e6c9]"
            : intensity < 0.6
            ? "bg-[#81c784]"
            : intensity < 0.85
            ? "bg-[#4caf50]"
            : "bg-[#2e7d4f]";
          return (
            <div
              key={i}
              className={cn("w-full aspect-square rounded-full", bg)}
              title={`${c.date}: ${c.count} повторений`}
            />
          );
        })}
      </div>
      <p className="text-[10px] text-[var(--foreground-soft)] mt-2">
        Чем темнее, тем больше повторений
      </p>
    </div>
  );
}

/* ─── Weak Characters List ──────────────────────────────────────────── */

function WeakCharsList({ chars }: { chars: Record<string, CharProgress> }) {
  const weak = useMemo(() =>
    Object.values(chars)
      .filter((c) => c.status === "weak" || c.lapses >= 2)
      .sort((a, b) => b.lapses - a.lapses)
      .slice(0, 5),
    [chars]
  );

  if (weak.length === 0) return (
    <p className="text-sm text-[var(--foreground-muted)]">Нет слабых иероглифов</p>
  );

  const reasons = [
    { label: "Ошибки в написании", color: "bg-[var(--red)]" },
    { label: "Ошибки в порядке черт", color: "bg-amber-400" },
    { label: "Забывается быстро", color: "bg-amber-300" },
  ];

  return (
    <div className="space-y-3">
      {weak.map((cp, idx) => {
        const c = getChar(cp.hanzi);
        if (!c) return null;
        const reason = reasons[idx % reasons.length];
        const barWidth = Math.min(100, Math.max(20, (cp.lapses / 5) * 100));
        return (
          <div key={cp.hanzi} className="flex items-center gap-3">
            <span className="hanzi text-2xl w-8 text-center">{cp.hanzi}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--foreground-muted)] truncate">{reason.label}</p>
              <div className="h-1.5 rounded-full bg-[var(--surface-3)] mt-1">
                <div
                  className={cn("h-full rounded-full", reason.color)}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Phase Progress Bar ────────────────────────────────────────────── */

const PHASE_LABELS: Record<string, string> = {
  warmup: "Разминка",
  recognition: "Узнавание",
  writing: "Письмо",
  context: "Контекст",
  srs: "Оценка",
};

function PhaseProgress({ phase, phases }: { phase: SessionPhase; phases: SessionPhase[] }) {
  const activePhases = phases.filter((p) => p !== "idle" && p !== "summary");
  const currentIdx = activePhases.indexOf(phase as typeof activePhases[number]);

  return (
    <div className="flex items-center gap-1 mb-6">
      {activePhases.map((p, i) => (
        <div key={p} className="flex items-center gap-1 flex-1">
          <div className="flex-1">
            <div className="text-[10px] text-center mb-1 font-medium" style={{
              color: i <= currentIdx ? "var(--green)" : "var(--foreground-soft)",
            }}>
              {PHASE_LABELS[p] || p}
            </div>
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i < currentIdx ? "bg-[var(--green)]" :
                i === currentIdx ? "bg-[var(--green)]" :
                "bg-[var(--surface-3)]",
              )}
              style={{
                opacity: i === currentIdx ? 0.7 : 1,
              }}
            />
          </div>
          {i < activePhases.length - 1 && (
            <ChevronRight size={12} className="text-[var(--foreground-soft)] mt-3 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Recognition Quiz ──────────────────────────────────────────────── */

function RecognitionCard({
  char,
  options,
  onAnswer,
}: {
  char: CharRecord;
  options: string[];
  onAnswer: (correct: boolean) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const correctAnswer = meaningRu(char) || char.meaningPrimary;

  const handleChoice = (opt: string) => {
    if (chosen) return;
    setChosen(opt);
    const isCorrect = opt === correctAnswer;
    setTimeout(() => onAnswer(isCorrect), 900);
  };

  return (
    <div className="flex flex-col items-center gap-6 float-up">
      <p className="text-sm text-[var(--foreground-muted)]">Выберите значение иероглифа</p>
      <div className="flex items-center gap-3">
        <span className="hanzi text-7xl leading-none">{char.hanzi}</span>
        <button onClick={() => speak(char.hanzi)} className="btn btn-ghost h-9 w-9 p-0">
          <Volume2 size={16} />
        </button>
      </div>
      <span className="pinyin text-lg text-[var(--foreground-muted)]">{char.pinyin}</span>
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {options.map((opt) => {
          const isCorrect = opt === correctAnswer;
          const isChosen = chosen === opt;
          return (
            <button
              key={opt}
              onClick={() => handleChoice(opt)}
              disabled={chosen !== null}
              className={cn(
                "rounded-[var(--radius-md)] border px-4 py-3.5 text-sm font-medium transition-all text-left",
                chosen === null && "hover:border-[var(--green)] hover:shadow-sm",
                isChosen && isCorrect && "border-[var(--green)] bg-[var(--green-soft)] ring-2 ring-[var(--green)]",
                isChosen && !isCorrect && "border-[var(--red)] bg-[var(--red-soft)] ring-2 ring-[var(--red)]",
                chosen && !isChosen && isCorrect && "border-[var(--green)] bg-[var(--green-soft)]",
                !chosen && "border-[var(--border)] bg-white",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Context Fill Card ─────────────────────────────────────────────── */

function ContextCard({
  char,
  allChars,
  onAnswer,
}: {
  char: CharRecord;
  allChars: CharRecord[];
  onAnswer: (correct: boolean) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);

  const { sentence, answer, distractors, meaning } = useMemo(() => {
    const template = SENTENCE_DB.find((t) => t.answer === char.hanzi);
    const sentenceText = template ? template.template : `___是好的`;
    const correctAns = template ? template.answer : char.hanzi;
    const sentenceMeaning = template ? template.meaning : "";
    // Stable, hanzi-seeded shuffle — see helpers above.
    const seed = stringSeed(char.hanzi);
    const pool = stableShuffle(
      allChars.filter(
        (c) =>
          c.hanzi !== correctAns && c.level <= Math.max(char.level, 2)
      ),
      seed
    )
      .slice(0, 3)
      .map((c) => c.hanzi);
    const opts = stableShuffle([correctAns, ...pool], seed + 1);
    return { sentence: sentenceText, answer: correctAns, distractors: opts, meaning: sentenceMeaning };
  }, [char, allChars]);

  const handleChoice = (opt: string) => {
    if (chosen) return;
    setChosen(opt);
    setTimeout(() => onAnswer(opt === answer), 900);
  };

  return (
    <div className="flex flex-col items-center gap-6 float-up">
      <p className="text-sm text-[var(--foreground-muted)]">Вставьте нужный иероглиф</p>
      <div className="card p-6">
        <div className="hanzi text-4xl tracking-widest text-center">
          {sentence.split("___").map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className={cn(
                  "inline-block w-12 border-b-2 mx-1 text-center",
                  chosen === answer ? "border-[var(--green)] text-[var(--green)]" :
                  chosen ? "border-[var(--red)] text-[var(--red)]" :
                  "border-[var(--border-strong)]"
                )}>
                  {chosen || "\u00A0"}
                </span>
              )}
            </span>
          ))}
        </div>
        {meaning && (
          <p className="text-xs text-[var(--foreground-muted)] text-center mt-3">{meaning}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {distractors.map((opt) => {
          const isCorrect = opt === answer;
          const isChosen = chosen === opt;
          return (
            <button
              key={opt}
              onClick={() => handleChoice(opt)}
              disabled={chosen !== null}
              className={cn(
                "hanzi text-3xl rounded-[var(--radius-md)] border px-6 py-4 transition-all",
                chosen === null && "hover:border-[var(--green)] hover:shadow-sm",
                isChosen && isCorrect && "border-[var(--green)] bg-[var(--green-soft)] ring-2 ring-[var(--green)]",
                isChosen && !isCorrect && "border-[var(--red)] bg-[var(--red-soft)] ring-2 ring-[var(--red)]",
                chosen && !isChosen && isCorrect && "border-[var(--green)] bg-[var(--green-soft)]",
                !chosen && "border-[var(--border)] bg-white",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── SRS Outcome Buttons ───────────────────────────────────────────── */

const SRS_BUTTONS: { id: Outcome; label: string; sublabel: string; color: string; bgColor: string; pandaSrc: string }[] = [
  { id: "again", label: "Снова", sublabel: "Повторить сейчас", color: "text-[var(--red-deep)]", bgColor: "bg-[var(--red-soft)] border-[var(--red)]/20", pandaSrc: "/panda/panda_head_sad.png" },
  { id: "hard", label: "Трудно", sublabel: "Через 1 день", color: "text-amber-800", bgColor: "bg-amber-50 border-amber-200", pandaSrc: "/panda/panda_head_neutral.png" },
  { id: "good", label: "Хорошо", sublabel: "Через 3 дня", color: "text-[var(--green-deep)]", bgColor: "bg-[var(--green-soft)] border-[var(--green)]/20", pandaSrc: "/panda/panda_head_smile.png" },
  { id: "easy", label: "Легко", sublabel: "Через неделю", color: "text-[var(--green-deep)]", bgColor: "bg-[var(--bamboo-soft)] border-[var(--bamboo)]/20", pandaSrc: "/panda/panda_head_happy.png" },
];

function SRSButtons({ char, onOutcome }: { char: CharRecord; onOutcome: (o: Outcome) => void }) {
  return (
    <div className="flex flex-col items-center gap-5 float-up">
      <Panda mood="studying" size={100} />
      <h3 className="text-lg font-display font-medium">Как прошло?</h3>
      <p className="text-sm text-[var(--foreground-muted)] text-center max-w-sm">
        Оцените, насколько легко вы вспомнили <span className="hanzi text-base">{char.hanzi}</span> ({meaningRu(char) || char.meaningPrimary})
      </p>

      <div className="grid grid-cols-4 gap-3 w-full max-w-lg mt-2">
        {SRS_BUTTONS.map(({ id, label, sublabel, color, bgColor, pandaSrc }) => (
          <button
            key={id}
            onClick={() => onOutcome(id)}
            className={cn(
              "rounded-[var(--radius-lg)] border px-3 py-5 flex flex-col items-center gap-2 transition-all hover:shadow-md active:scale-[0.97]",
              bgColor, color,
            )}
          >
            <Image src={pandaSrc} alt={label} width={48} height={48} className="select-none" />
            <span className="font-semibold text-sm">{label}</span>
            <span className="text-[10px] opacity-60 text-center leading-tight">{sublabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Summary Screen ────────────────────────────────────────────────── */

function SummaryScreen({
  stats,
  weakChars,
  onClose,
}: {
  stats: SessionStats;
  weakChars: string[];
  onClose: () => void;
}) {
  // Compute time on mount via a microtask so the state update is not
  // synchronous within the effect body (react-hooks/set-state-in-effect).
  const [timeMin, setTimeMin] = useState(1);
  useEffect(() => {
    void Promise.resolve().then(() => {
      setTimeMin(
        Math.max(1, Math.round((Date.now() - stats.startTime) / 60000))
      );
    });
  }, [stats.startTime]);

  // §18 / §22: no celebration, no «Excellent!», no shame. The session
  // simply ends; tomorrow continues it.
  return (
    <div className="flex flex-col items-center gap-6 py-8 float-up max-w-lg mx-auto">
      <Panda mood="resting" size={140} />
      <h2 className="text-2xl font-display font-medium">Сессия закрыта</h2>
      <p className="text-[var(--foreground-muted)] text-center max-w-sm">
        Сегодня вы прошли {stats.total} {pluralChars(stats.total)}.{" "}
        До завтра.
      </p>

      <div className="grid grid-cols-3 gap-3 w-full">
        <div className="card-soft p-4 text-center">
          <div className="text-2xl font-display font-medium tabular-nums">{stats.total}</div>
          <div className="text-xs text-[var(--foreground-muted)] mt-1">пройдено</div>
        </div>
        <div className="card-soft p-4 text-center">
          <div className="text-2xl font-display font-medium tabular-nums">{stats.written}</div>
          <div className="text-xs text-[var(--foreground-muted)] mt-1">написано</div>
        </div>
        <div className="card-soft p-4 text-center">
          <div className="text-2xl font-display font-medium tabular-nums">{timeMin}</div>
          <div className="text-xs text-[var(--foreground-muted)] mt-1">мин</div>
        </div>
      </div>

      {weakChars.length > 0 && (
        <div className="w-full card-soft p-4">
          <p className="text-sm font-medium mb-2 text-[var(--foreground)]">
            Стоит вернуться:
          </p>
          <div className="flex gap-2 flex-wrap">
            {weakChars.map((h) => {
              const c = getChar(h);
              return (
                <div key={h} className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] px-3 py-1.5">
                  <span className="hanzi text-lg">{h}</span>
                  {c && <span className="text-xs text-[var(--foreground-muted)]">{meaningShort(c)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={onClose} className="btn btn-success mt-2">
        Готово
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN REVIEW PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function ReviewPage() {
  const chars = useProgress((s) => s.chars);

  const daily = useProgress((s) => s.daily);
  const recordOutcome = useProgress((s) => s.recordOutcome);

  /* Writing canvas size — responsive to viewport so mobile (≤480px) gets
     a smaller canvas that fits next to its action buttons without
     horizontal scroll. */
  const vw = useViewportWidth();
  const writingSize =
    vw === null ? 300 : vw < 380 ? 220 : vw < 480 ? 260 : 300;

  /* Session state */
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [queue, setQueue] = useState<string[]>([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [writingDone, setWritingDone] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
  // Lazy initializer keeps Date.now() out of render — required by
  // react-hooks/purity, since the initial-value expression is evaluated
  // every render in useState's eager form.
  const [sessionStats, setSessionStats] = useState<SessionStats>(() => ({
    total: 0, correct: 0, written: 0, recognized: 0, contextCorrect: 0, startTime: Date.now(),
  }));
  const [weakThisSession, setWeakThisSession] = useState<string[]>([]);
  /* Session-size selector (§19.5 #6). Default is `default` (≈18 min). */
  const [sessionSize, setSessionSize] =
    useState<"quick" | "default" | "deep">("default");

  /* Dashboard stats — always computed */
  const dueCnt = useMemo(() => dueChars(chars).length, [chars]);
  const weakCnt = useMemo(() => Object.values(chars).filter((c) => c.status === "weak" || c.lapses >= 2).length, [chars]);
  /* SRS visibility — how many already-studied characters are *not yet* due
     (so the user understands where their progress went; without this the
     dashboard appears empty after a lesson because SRS intervals
     correctly defer the first review). `now` is kept in state and ticked
     by an effect to satisfy `react-hooks/purity` (Date.now is impure). */
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    void Promise.resolve().then(() => setNowMs(Date.now()));
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const upcoming = useMemo(() => {
    if (nowMs === null) return { count: 0, nextDueMs: 0 };
    const future = Object.values(chars).filter((c) => c.due > nowMs);
    if (future.length === 0) return { count: 0, nextDueMs: 0 };
    const next = future.reduce(
      (min, c) => (c.due < min ? c.due : min),
      Infinity,
    );
    return { count: future.length, nextDueMs: next - nowMs };
  }, [chars, nowMs]);
  const todayEntry = useMemo(() => {
    const t = today();
    return daily.find((e) => e.date === t);
  }, [daily]);
  const todayReviewed = todayEntry?.reviewed ?? 0;
  const hasAnyStudied = Object.keys(chars).length > 0;

  /* Mini bar chart data */
  const todayBars = useMemo(() => {
    const last7 = daily.slice(-7);
    const maxR = Math.max(1, ...last7.map((d) => d.reviewed));
    return last7.map((d) => ({
      date: d.date,
      height: Math.max(8, (d.reviewed / maxR) * 100),
      reviewed: d.reviewed,
    }));
  }, [daily]);

  /* Current review character */
  const currentHanzi = queue[queueIdx] ?? null;
  const currentChar = currentHanzi ? getChar(currentHanzi) : null;

  /* Build quiz options for recognition. Stable, hanzi-seeded shuffle
     (Mulberry-style) so identical re-renders return identical options. */
  const quizOptions = useMemo(() => {
    if (!currentChar) return [];
    const correct = meaningRu(currentChar) || currentChar.meaningPrimary;
    const seed = stringSeed(currentChar.hanzi);
    const pool = stableShuffle(
      ALL_CHARACTERS
        .filter(
          (c) =>
            c.hanzi !== currentChar.hanzi &&
            c.level <= Math.max(currentChar.level, 2) &&
            meaningRu(c)
        ),
      seed
    )
      .slice(0, 3)
      .map((c) => meaningRu(c));
    return stableShuffle([correct, ...pool], seed + 1);
  }, [currentChar]);

  /* Session phase sequence */
  const sessionPhases: SessionPhase[] = ["warmup", "recognition", "writing", "context", "srs"];

  /* Start review session.
     Mode determines which queue is loaded; size sets the cap.
     Quick session (§19.5 #6) caps at 5 items for ~3 minutes — the
     daily minimum that still keeps the streak alive (§13). */
  const startSession = useCallback(
    (mode: "all" | "weak" | "writing", size: "quick" | "default" | "deep" = "default") => {
      let q: string[];
      if (mode === "weak") {
        q = Object.values(chars)
          .filter((c) => c.status === "weak" || c.lapses >= 2)
          .sort((a, b) => b.lapses - a.lapses)
          .map((c) => c.hanzi);
      } else {
        q = dueChars(chars).map((c) => c.hanzi);
      }
      if (q.length === 0) return;

      const cap = size === "quick" ? 5 : size === "deep" ? 30 : 15;
      // Stable shuffle that doesn't violate the react-hooks/purity lint:
      // we seed it on the current epoch so the order is stable within a
      // single call but varied between sessions.
      const seed = Date.now();
      const shuffled = q
        .map((h, i) => ({ h, k: (i * 9301 + seed * 49297) % 233280 }))
        .sort((a, b) => a.k - b.k)
        .map((x) => x.h)
        .slice(0, cap);
      setQueue(shuffled);
      setQueueIdx(0);
      setWritingDone(false);
      setShowStrokeOrder(false);
      setShowTip(false);
      setWeakThisSession([]);
      setSessionStats({ total: 0, correct: 0, written: 0, recognized: 0, contextCorrect: 0, startTime: Date.now() });
      setPhase("warmup");
    },
    [chars]
  );

  /* Advance to next character within current phase, or move to next phase */
  const advanceInPhase = useCallback(() => {
    const nextIdx = queueIdx + 1;
    if (nextIdx >= queue.length) {
      // Move to next session phase
      const phaseOrder: SessionPhase[] = ["warmup", "recognition", "writing", "context", "srs"];
      const currentPhaseIdx = phaseOrder.indexOf(phase);
      if (currentPhaseIdx < phaseOrder.length - 1) {
        const nextPhase = phaseOrder[currentPhaseIdx + 1];
        setQueueIdx(0);
        setWritingDone(false);
        setShowStrokeOrder(false);
        setPhase(nextPhase);
      } else {
        setPhase("summary");
      }
    } else {
      setQueueIdx(nextIdx);
      setWritingDone(false);
      setShowStrokeOrder(false);
    }
  }, [queueIdx, queue.length, phase]);

  /* Handle SRS outcome (final step per character) */
  const handleSRSOutcome = useCallback((outcome: Outcome) => {
    if (!currentHanzi) return;
    recordOutcome(currentHanzi, outcome);
    if (outcome === "again") {
      setWeakThisSession((prev) => prev.includes(currentHanzi) ? prev : [...prev, currentHanzi]);
    }
    setSessionStats((s) => ({
      ...s,
      total: s.total + 1,
      correct: outcome !== "again" ? s.correct + 1 : s.correct,
    }));
    advanceInPhase();
  }, [currentHanzi, recordOutcome, advanceInPhase]);

  /* ─── Empty state ─────────────────────────────────────────────────── */
  if (!hasAnyStudied) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-8 py-12 text-center flex flex-col items-center gap-5">
        <Panda mood="resting" size={140} />
        <h1 className="text-3xl font-display font-medium">Повторений нет</h1>
        <p className="text-[var(--foreground-muted)]">
          Пройдите хотя бы один урок, чтобы здесь появились иероглифы для повторения.
        </p>
        <Link href="/learn" className="btn btn-primary">Начать урок</Link>
      </div>
    );
  }

  /* ─── Summary phase ───────────────────────────────────────────────── */
  if (phase === "summary") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
        <SummaryScreen stats={sessionStats} weakChars={weakThisSession} onClose={() => setPhase("idle")} />
      </div>
    );
  }

  /* ─── Right sidebar (shared between session & dashboard) ──────────── */
  const rightSidebar = (
    <div className="space-y-5 hidden lg:block">
      <Card className="p-5">
        <h3 className="font-medium mb-4">Сегодня</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--green)] tabular-nums">{dueCnt || todayReviewed}</div>
            <div className="text-[11px] text-[var(--foreground-muted)]">к изучению</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--red)] tabular-nums">{weakCnt}</div>
            <div className="text-[11px] text-[var(--foreground-muted)]">слабых</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-[var(--foreground-muted)]" />
          <span className="text-sm text-[var(--foreground-muted)]">{Math.max(1, Math.round(todayReviewed * 0.7))} мин потрачено</span>
        </div>
        <div className="flex items-end gap-1 h-12 mt-3">
          {todayBars.map((bar, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-[var(--green)] transition-all"
              style={{ height: `${bar.height}%` }}
              title={`${bar.date}: ${bar.reviewed}`}
            />
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Слабые иероглифы</h3>
          {weakCnt > 0 && (
            <button onClick={() => startSession("weak")} className="text-xs text-[var(--green)] font-medium hover:underline">
              Тренировать
            </button>
          )}
        </div>
        <WeakCharsList chars={chars} />
      </Card>

      <Card className="p-5">
        <h3 className="font-medium mb-3">Календарь повторений</h3>
        <ReviewHeatmap daily={daily} />
      </Card>

      <div className="rounded-[var(--radius-lg)] overflow-hidden relative bg-gradient-to-br from-[var(--green-soft)] to-[var(--bamboo-soft)] p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--green-deep)] mb-1">Продолжайте!</h3>
            <p className="text-xs text-[var(--green-deep)] opacity-80">Постоянство — ключ к успеху.</p>
          </div>
          <Panda mood="practicing" size={80} />
        </div>
      </div>
    </div>
  );

  /* ─── Active review session ───────────────────────────────────────── */
  if (phase !== "idle" && currentChar) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-display font-semibold text-[var(--ink)]">Повторение</h1>
          <button onClick={() => setPhase("summary")} className="btn btn-ghost text-sm py-1.5 px-3 flex items-center gap-1">
            Завершить <SkipForward size={14} />
          </button>
        </div>
        <p className="text-sm text-[var(--foreground-muted)] mb-1">Сегодняшняя цель</p>
        <div className="flex items-end gap-3 mb-2">
          <span className="text-4xl font-bold text-[var(--green)] leading-none tabular-nums">{todayReviewed}</span>
          <span className="text-base text-[var(--foreground-muted)] pb-0.5">/ 30 мин</span>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-2.5 rounded-full bg-[var(--surface-3)] overflow-hidden max-w-lg">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-[width] duration-500"
              style={{ width: `${Math.min(100, (todayReviewed / 30) * 100)}%` }}
            />
          </div>
        </div>

        {/* Phase progress bar */}
        <PhaseProgress phase={phase} phases={sessionPhases} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="flex flex-col items-center lg:items-stretch">
            {/* Session progress row */}
            <div className="flex items-center gap-3 mb-5 w-full">
              {phase === "warmup" && <Brain size={16} className="text-[var(--foreground-muted)]" />}
              {phase === "recognition" && <HelpCircle size={16} className="text-[var(--foreground-muted)]" />}
              {phase === "writing" && <PenTool size={16} className="text-[var(--foreground-muted)]" />}
              {phase === "context" && <BookOpen size={16} className="text-[var(--foreground-muted)]" />}
              {phase === "srs" && <Star size={16} className="text-[var(--foreground-muted)]" />}
              <span className="text-sm font-medium">{PHASE_LABELS[phase]}</span>
              <span className="text-sm tabular-nums text-[var(--foreground-muted)]">{queueIdx + 1} / {queue.length}</span>
              <div className="flex-1" />
              {phase !== "warmup" && (
                <button
                  onClick={advanceInPhase}
                  className="btn btn-ghost text-sm py-1.5 px-3 flex items-center gap-1"
                >
                  Далее <ChevronRight size={14} />
                </button>
              )}
            </div>

            {/* ─── WARMUP PHASE ─── *
                Tinder-like swipe stack. The card is the queue's current
                hanzi; pinyin/meaning are hidden until the user taps to
                reveal. Swipe right → "remember" → SRS forward. Swipe
                left → "forget" → enqueued into weakThisSession so later
                phases re-show it. */}
            {phase === "warmup" && (
              <SwipeStack
                queue={queue}
                index={queueIdx}
                onCommit={(hanzi, outcome) => {
                  if (outcome === "remember") {
                    setSessionStats((s) => ({
                      ...s,
                      recognized: s.recognized + 1,
                    }));
                  } else {
                    setWeakThisSession((prev) =>
                      prev.includes(hanzi) ? prev : [...prev, hanzi],
                    );
                  }
                  advanceInPhase();
                }}
              />
            )}

            {/* ─── RECOGNITION PHASE ─── */}
            {phase === "recognition" && (
              <RecognitionCard
                key={`rec-${currentHanzi}-${queueIdx}`}
                char={currentChar}
                options={quizOptions}
                onAnswer={(correct) => {
                  setSessionStats((s) => ({
                    ...s,
                    recognized: s.recognized + (correct ? 1 : 0),
                  }));
                  if (!correct) {
                    setWeakThisSession((prev) =>
                      prev.includes(currentChar.hanzi) ? prev : [...prev, currentChar.hanzi]
                    );
                  }
                  setTimeout(() => advanceInPhase(), 200);
                }}
              />
            )}

            {/* ─── WRITING PHASE ─── */}
            {phase === "writing" && (
              <div className="float-up w-full">
                <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
                  {/* Left: character info */}
                  <div className="card p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => speak(currentChar.hanzi)} className="btn btn-ghost h-9 w-9 p-0">
                        <Volume2 size={18} />
                      </button>
                      <span className="pinyin text-xl">{currentChar.pinyin}</span>
                    </div>
                    <div className="hanzi text-7xl text-center leading-none py-3">{currentChar.hanzi}</div>
                    <div className="text-center text-base font-medium">{meaningRu(currentChar) || currentChar.meaningPrimary}</div>

                    {currentChar.components && currentChar.components.length > 0 && (
                      <div>
                        <p className="text-xs text-[var(--foreground-muted)] mb-1.5">Состав:</p>
                        <div className="flex items-center gap-2 justify-center">
                          {currentChar.components.map((comp, i) => (
                            <span key={i} className="flex items-center gap-2">
                              {i > 0 && <span className="text-[var(--foreground-soft)]">+</span>}
                              <span className="hanzi text-xl card-soft px-2.5 py-1">{comp}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: writing canvas + actions */}
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Напишите иероглиф. Соблюдайте порядок черт.
                    </p>

                    <div className="flex items-start gap-3 sm:gap-4 max-w-full">
                      <div className="relative">
                        {showStrokeOrder ? (
                          <div
                            className="rounded-[18px] border border-[var(--border)] bg-white overflow-hidden"
                            style={{
                              width: writingSize + 24,
                              height: writingSize + 24,
                              padding: 12,
                            }}
                          >
                            <StrokeAnimation
                              hanzi={currentChar.hanzi}
                              size={writingSize}
                              autoplay
                            />
                          </div>
                        ) : (
                          <WritingQuiz
                            key={`${currentHanzi}-${queueIdx}`}
                            hanzi={currentChar.hanzi}
                            size={writingSize}
                            showOutline
                            hideInitialFeedback
                            onComplete={() => {
                              setWritingDone(true);
                              setSessionStats((s) => ({ ...s, written: s.written + 1 }));
                            }}
                          />
                        )}
                      </div>

                      {/* Side buttons */}
                      <div className="flex flex-col gap-2 sm:gap-3 shrink-0">
                        <button
                          onClick={() => { setShowStrokeOrder(false); setWritingDone(false); }}
                          className="card-soft w-12 h-12 sm:w-14 sm:h-14 flex flex-col items-center justify-center gap-0.5 hover:bg-[var(--surface-2)] transition-colors"
                          title="Заново"
                        >
                          <RotateCcw size={18} className="text-[var(--foreground-muted)]" />
                          <span className="text-[9px] sm:text-[10px] text-[var(--foreground-muted)]">Заново</span>
                        </button>
                        <button
                          onClick={() => setShowStrokeOrder(!showStrokeOrder)}
                          className="card-soft w-12 h-12 sm:w-14 sm:h-14 flex flex-col items-center justify-center gap-0.5 hover:bg-[var(--surface-2)] transition-colors"
                          title="Показать порядок"
                        >
                          <Eye size={18} className="text-[var(--foreground-muted)]" />
                          <span className="text-[9px] sm:text-[10px] text-[var(--foreground-muted)] leading-tight text-center">Порядок</span>
                        </button>
                      </div>
                    </div>

                    {/* Continue button after writing is done */}
                    {writingDone && (
                      <button
                        onClick={advanceInPhase}
                        className="btn btn-success mt-2 flex items-center gap-2"
                      >
                        Далее <ArrowRight size={16} />
                      </button>
                    )}

                    {/* Tip section */}
                    <div className="w-full mt-2">
                      <button
                        onClick={() => setShowTip(!showTip)}
                        className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors w-full"
                      >
                        <Lightbulb size={16} className="text-[var(--foreground-muted)]" />
                        <span className="font-medium text-[var(--green-deep)]">Совет</span>
                        <ChevronDown size={14} className={cn("transition-transform ml-auto", showTip && "rotate-180")} />
                      </button>
                      {showTip && (
                        <div className="mt-2 text-sm text-[var(--foreground-muted)] pl-7">
                          Соблюдайте порядок черт: сверху вниз, слева направо.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── CONTEXT PHASE ─── */}
            {phase === "context" && (
              <ContextCard
                key={`ctx-${currentHanzi}-${queueIdx}`}
                char={currentChar}
                allChars={ALL_CHARACTERS}
                onAnswer={(correct) => {
                  setSessionStats((s) => ({
                    ...s,
                    contextCorrect: s.contextCorrect + (correct ? 1 : 0),
                  }));
                  if (!correct) {
                    setWeakThisSession((prev) =>
                      prev.includes(currentChar.hanzi) ? prev : [...prev, currentChar.hanzi]
                    );
                  }
                  setTimeout(() => advanceInPhase(), 200);
                }}
              />
            )}

            {/* ─── SRS PHASE ─── */}
            {phase === "srs" && (
              <SRSButtons char={currentChar} onOutcome={handleSRSOutcome} />
            )}
          </div>

          {/* Right sidebar — always visible during session */}
          {rightSidebar}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     DASHBOARD (idle phase)
     ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
      <h1 className="text-3xl font-display font-semibold mb-2 text-[var(--ink)]">Повторение</h1>
      <p className="text-sm text-[var(--foreground-muted)] mb-1">Сегодняшняя цель</p>
      <div className="flex items-end gap-3 mb-2">
        <span className="text-4xl font-bold text-[var(--green)] leading-none tabular-nums">
          {todayReviewed}
        </span>
        <span className="text-base text-[var(--foreground-muted)] pb-0.5">/ 30 мин</span>
      </div>
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-2.5 rounded-full bg-[var(--surface-3)] overflow-hidden max-w-lg">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-[width] duration-500"
            style={{ width: `${Math.min(100, (todayReviewed / 30) * 100)}%` }}
          />
        </div>
      </div>

      {/* Session-size selector — §3 sizes from §9: Quick (≈3 min),
          Default (≈18–22 min), Deep (≈30–40 min). The Quick option is
          always available because the daily floor is what keeps the
          streak alive (§13 «1 minute counts»). */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--foreground-soft)] mr-1">
          Размер сессии
        </span>
        {([
          { id: "quick" as const,   label: "Коротко",   sub: "≈3 мин"  },
          { id: "default" as const, label: "Обычно",   sub: "≈18 мин" },
          { id: "deep" as const,    label: "Глубоко",   sub: "≈30 мин" },
        ]).map((o) => (
          <button
            key={o.id}
            onClick={() => setSessionSize(o.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm flex items-baseline gap-1.5 transition-colors",
              sessionSize === o.id
                ? "bg-[var(--ink)] text-[var(--background)] border-[var(--ink)]"
                : "bg-transparent text-[var(--foreground-muted)] border-[var(--border-strong)] hover:text-[var(--foreground)]"
            )}
          >
            <span>{o.label}</span>
            <span className="text-[10px] opacity-70 tabular-nums">{o.sub}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          {/* Session cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => startSession("all", sessionSize)}
              disabled={dueCnt === 0}
              className="card p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--green-soft)] flex items-center justify-center">
                <BookOpen size={22} className="text-[var(--green)]" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--green)]">{dueCnt}</div>
                <div className="text-sm text-[var(--foreground-muted)]">к повторению</div>
              </div>
              {dueCnt > 0 && (
                <span className="btn btn-success text-xs py-1.5 px-4">Начать</span>
              )}
            </button>

            <button
              onClick={() => startSession("weak", sessionSize)}
              disabled={weakCnt === 0}
              className="card p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                <Zap size={22} className="text-amber-500" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">{weakCnt}</div>
                <div className="text-sm text-[var(--foreground-muted)]">слабых</div>
              </div>
              {weakCnt > 0 && (
                <span className="btn btn-secondary text-xs py-1.5 px-4">Тренировать</span>
              )}
            </button>

            <button
              onClick={() => startSession("writing", sessionSize)}
              disabled={dueCnt === 0}
              className="card p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <PenTool size={22} className="text-blue-500" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500">{Math.min(dueCnt, 15)}</div>
                <div className="text-sm text-[var(--foreground-muted)]">письмо</div>
              </div>
              {dueCnt > 0 && (
                <span className="btn btn-secondary text-xs py-1.5 px-4">Писать</span>
              )}
            </button>
          </div>

          {/* Due characters preview grid */}
          {dueCnt > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-medium">Готово к повторению</h2>
                <span className="text-sm text-[var(--foreground-muted)]">{dueCnt} {pluralChars(dueCnt)}</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {dueChars(chars).slice(0, 24).map((cp) => {
                  const c = getChar(cp.hanzi);
                  if (!c) return null;
                  return (
                    <div
                      key={cp.hanzi}
                      className="card-soft p-2 flex flex-col items-center gap-1 hover:shadow-sm transition-shadow"
                    >
                      <span className="hanzi text-2xl">{c.hanzi}</span>
                      <span className="text-[10px] text-[var(--foreground-muted)] truncate w-full text-center">
                        {meaningShort(c)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {dueCnt > 24 && (
                <p className="text-center text-xs text-[var(--foreground-muted)] mt-3">
                  и ещё {dueCnt - 24}...
                </p>
              )}
            </Card>
          )}

          {dueCnt === 0 && (
            <Card className="p-8 text-center">
              <Panda mood="success" size={100} className="mx-auto mb-4" />
              <h2 className="text-xl font-display font-medium mb-2">
                Все повторения выполнены!
              </h2>
              <p className="text-[var(--foreground-muted)]">
                {upcoming.count > 0 ? (
                  <>
                    {upcoming.count} {pluralChars(upcoming.count)} вернётся{" "}
                    {formatRelativeIn(upcoming.nextDueMs)}.
                  </>
                ) : (
                  <>Возвращайтесь позже или изучите новый урок.</>
                )}
              </p>
              <Link href="/learn" className="btn btn-primary mt-4 inline-flex">
                Продолжить обучение
              </Link>
            </Card>
          )}

          {/* SRS visibility — explain why some studied characters
              haven't yet appeared in the review queue. Hidden when there
              are none in the future. */}
          {upcoming.count > 0 && (
            <Card className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-[var(--foreground-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium mb-1">
                    Ближайшие повторения
                  </h3>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    Ещё {upcoming.count} {pluralChars(upcoming.count)} в очереди
                    — следующий{" "}
                    <span className="text-[var(--foreground)] font-medium">
                      {formatRelativeIn(upcoming.nextDueMs)}
                    </span>
                    . Иероглифы возвращаются по интервалам: 1 день → 3 дня →
                    неделя → месяц. Так память укрепляется без перегрузки.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {rightSidebar}
      </div>
    </div>
  );
}

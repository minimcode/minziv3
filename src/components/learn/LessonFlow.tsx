"use client";

import { useMemo, useState } from "react";
import { Lesson, CharRecord, meaningRu } from "@/lib/characters";
import { useProgress } from "@/store/progress";
import { StrokeAnimation } from "./StrokeAnimation";
import { WritingQuiz } from "./WritingQuiz";
import { PracticeTask } from "./PracticeTask";
import { Graphemes } from "./Graphemes";
import { HanziStrokes } from "./HanziStrokes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Panda } from "@/components/ui/Panda";
import { ProgressBar } from "@/components/ui/Progress";
import { ArrowRight, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Step =
  | { kind: "intro"; charIdx: number }
  | { kind: "stroke"; charIdx: number }
  | { kind: "guided"; charIdx: number }
  | { kind: "recall"; charIdx: number }
  | { kind: "practice"; charIdx: number; taskIdx: 0 | 1 }
  | { kind: "grammar" }
  | { kind: "summary" };

interface Props {
  lesson: Lesson;
  characters: CharRecord[]; // Resolved CharRecord[] for the lesson's hanzi
  pool: CharRecord[]; // Distractor pool for practice options
  onExit: () => void;
}

export function LessonFlow({ lesson, characters, pool, onExit }: Props) {
  const recordOutcome = useProgress((s) => s.recordOutcome);
  const completeLesson = useProgress((s) => s.completeLesson);

  const totalCharSteps = characters.length * 5; // 5 steps per char
  const totalSteps = totalCharSteps + (lesson.grammarNote ? 1 : 0) + 1;
  const [stepIdx, setStepIdx] = useState(0);
  // Per-step selected grapheme index → drives the static stroke highlight on
  // the intro card. Reset whenever we leave the intro step / switch chars.
  const [selectedGrapheme, setSelectedGrapheme] = useState<number | null>(null);
  const [exerciseDone, setExerciseDone] = useState(false);

  const step: Step = useMemo(() => {
    if (stepIdx < totalCharSteps) {
      const charIdx = Math.floor(stepIdx / 5);
      const phase = stepIdx % 5;
      if (phase === 0) return { kind: "intro", charIdx };
      if (phase === 1) return { kind: "stroke", charIdx };
      if (phase === 2) return { kind: "guided", charIdx };
      if (phase === 3) return { kind: "recall", charIdx };
      return { kind: "practice", charIdx, taskIdx: 0 };
    }
    if (lesson.grammarNote && stepIdx === totalCharSteps) {
      return { kind: "grammar" };
    }
    return { kind: "summary" };
  }, [stepIdx, totalCharSteps, lesson.grammarNote]);

  const next = () => {
    setSelectedGrapheme(null);
    setExerciseDone(false);
    setStepIdx((i) => Math.min(totalSteps - 1, i + 1));
  };

  const finish = () => {
    completeLesson(lesson.id);
    onExit();
  };

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4 sm:px-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        {(step.kind === "intro" || step.kind === "stroke" || step.kind === "grammar" || step.kind === "summary") ? (
          <button
            onClick={onExit}
            className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          >
            ← Выход
          </button>
        ) : (
          <div className="text-sm text-[var(--foreground-muted)] opacity-40 cursor-not-allowed select-none">
            ← Выход
          </div>
        )}
        <div className="flex-1 mx-4">
          <ProgressBar value={stepIdx + 1} max={totalSteps} />
        </div>
        <span className="text-xs text-[var(--foreground-muted)] tabular-nums">
          {stepIdx + 1} / {totalSteps}
        </span>
      </div>

      {/* Step body */}
      {step.kind === "intro" && (() => {
        const c = characters[step.charIdx];
        const stc = c.strokeToComponent ?? null;
        const highlighted =
          selectedGrapheme !== null && stc
            ? stc
                .map((v, i) => (v === selectedGrapheme ? i : -1))
                .filter((i) => i >= 0)
            : null;
        return (
          <Card className="p-8 sm:p-10 flex flex-col items-center text-center gap-5 float-up">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
              Иероглиф {step.charIdx + 1} из {characters.length}
            </div>
            <div className="relative">
              <HanziStrokes
                key={`intro-${c.hanzi}`}
                hanzi={c.hanzi}
                size={300}
                highlightedStrokes={highlighted}
              />
              <button
                onClick={() => speak(c.hanzi)}
                className="absolute top-2 right-2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:shadow-md transition-shadow"
                aria-label="Произнести"
              >
                <Volume2 size={16} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="pinyin text-2xl text-[var(--foreground-muted)] leading-tight">
                {c.pinyin}
              </div>
              <div className="text-xl font-medium leading-snug max-w-md break-words">
                {meaningRu(c)}
              </div>
            </div>
            {(c.components?.length ?? 0) > 0 && (
              <>
                <div className="ink-divider w-2/3 my-1" />
                <Graphemes
                  char={c}
                  selectedIndex={selectedGrapheme}
                  onSelect={(i) => setSelectedGrapheme(i)}
                />
              </>
            )}
            <Button onClick={next} size="lg">
              Дальше <ArrowRight size={16} />
            </Button>
          </Card>
        );
      })()}

      {step.kind === "stroke" && (
        <Card className="p-8 sm:p-10 flex flex-col items-center gap-6 float-up">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
              Порядок черт
            </div>
            <div className="mt-2 pinyin text-[var(--foreground-muted)]">
              {characters[step.charIdx].pinyin} ·{" "}
              {meaningRu(characters[step.charIdx])}
            </div>
          </div>
          <StrokeAnimation
            key={`stroke-${characters[step.charIdx].hanzi}`}
            hanzi={characters[step.charIdx].hanzi}
            size={300}
            autoplay
          />
          <Button onClick={next} size="lg">
            Дальше <ArrowRight size={16} />
          </Button>
        </Card>
      )}

      {step.kind === "guided" && (
        <Card className="p-8 sm:p-10 flex flex-col items-center gap-5 float-up">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
              Пишите по образцу
            </div>
            <div className="mt-2 pinyin text-[var(--foreground-muted)]">
              {characters[step.charIdx].pinyin} ·{" "}
              {meaningRu(characters[step.charIdx])}
            </div>
          </div>
          <WritingQuiz
            key={`guided-${characters[step.charIdx].hanzi}`}
            hanzi={characters[step.charIdx].hanzi}
            size={300}
            showOutline={true}
            onComplete={({ totalMistakes }) => {
              recordOutcome(
                characters[step.charIdx].hanzi,
                totalMistakes === 0 ? "easy" : totalMistakes <= 2 ? "good" : "hard"
              );
              setExerciseDone(true);
            }}
          />
          {exerciseDone && (
            <Button onClick={next} size="lg">
              Дальше <ArrowRight size={16} />
            </Button>
          )}
        </Card>
      )}

      {step.kind === "recall" && (
        <Card className="p-8 sm:p-10 flex flex-col items-center gap-5 float-up">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
              Напишите по памяти
            </div>
            <div className="mt-2 pinyin text-[var(--foreground-muted)]">
              {characters[step.charIdx].pinyin} ·{" "}
              {meaningRu(characters[step.charIdx])}
            </div>
          </div>
          <WritingQuiz
            key={`recall-${characters[step.charIdx].hanzi}`}
            hanzi={characters[step.charIdx].hanzi}
            size={300}
            showOutline={false}
            onComplete={({ totalMistakes }) => {
              recordOutcome(
                characters[step.charIdx].hanzi,
                totalMistakes === 0 ? "easy" : totalMistakes <= 2 ? "good" : "hard"
              );
              setExerciseDone(true);
            }}
          />
          {exerciseDone && (
            <Button onClick={next} size="lg">
              Дальше <ArrowRight size={16} />
            </Button>
          )}
        </Card>
      )}

      {step.kind === "practice" && (
        <Card className="p-8 sm:p-10 flex flex-col items-center gap-5 float-up">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
            Закрепляем
          </div>
          <PracticeTask
            key={`practice-${characters[step.charIdx].hanzi}`}
            target={characters[step.charIdx]}
            pool={pool}
            kind="h2m"
            onDone={({ correct }) => {
              recordOutcome(
                characters[step.charIdx].hanzi,
                correct ? "good" : "again"
              );
              setTimeout(next, 250);
            }}
          />
        </Card>
      )}

      {step.kind === "grammar" && lesson.grammarNote && (
        <Card className="p-8 sm:p-10 flex flex-col gap-4 float-up">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
            Грамматика
          </div>
          <h2 className="text-2xl font-display font-medium">
            {lesson.grammarNote.title}
          </h2>
          <p className="text-[var(--foreground-muted)]">
            {lesson.grammarNote.body}
          </p>
          {lesson.grammarNote.examples && (
            <div className="grid gap-2 mt-2">
              {lesson.grammarNote.examples.map((ex, i) => (
                <div
                  key={i}
                  className="card-soft px-4 py-3 flex items-baseline gap-3 flex-wrap"
                >
                  <span className="hanzi text-2xl">{ex.hanzi}</span>
                  <span className="pinyin text-sm text-[var(--foreground-muted)]">
                    {ex.pinyin}
                  </span>
                  <span className="text-sm">{ex.ru}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end mt-2">
            <Button onClick={next} size="lg">
              Дальше <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {step.kind === "summary" && (
        <Card className="p-8 sm:p-10 flex flex-col items-center text-center gap-5 float-up">
          <Panda mood="success" size={140} />
          <h2 className="text-3xl font-display font-medium">Урок завершён!</h2>
          <p className="text-[var(--foreground-muted)] max-w-md">
            Вы изучили {characters.length}{" "}
            {plural(characters.length, "иероглиф", "иероглифа", "иероглифов")}.
            Они появятся в ваших повторениях в нужный момент.
          </p>
          <div className="grid grid-cols-5 gap-2 mt-1">
            {characters.map((c) => (
              <div
                key={c.hanzi}
                className={cn(
                  "card-soft px-2 py-3 flex flex-col items-center gap-1"
                )}
              >
                <span className="hanzi text-2xl">{c.hanzi}</span>
                <span className="pinyin text-[10px] text-[var(--foreground-muted)]">
                  {c.pinyin}
                </span>
              </div>
            ))}
          </div>
          <Button onClick={finish} size="lg">
            Завершить
          </Button>
        </Card>
      )}
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

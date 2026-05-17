"use client";

import { useMemo, useState } from "react";
import {
  ALL_LESSONS,
  Lesson,
  CharRecord,
  meaningRu,
} from "@/lib/characters";
import { getWordsForLesson, type WordRecord } from "@/lib/words";
import {
  patternsFor,
  buildImageQuiz,
  type SentencePattern,
  type ImageMatchEntry,
} from "@/lib/sentences";
import { useProgress } from "@/store/progress";
import { StrokeAnimation } from "./StrokeAnimation";
import { WritingQuiz } from "./WritingQuiz";
import { PracticeTask } from "./PracticeTask";
import { Graphemes } from "./Graphemes";
import { HanziStrokes } from "./HanziStrokes";
import { WordList } from "./WordList";
import { SentenceBuilder } from "./SentenceBuilder";
import { ImageMatch } from "./ImageMatch";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Panda } from "@/components/ui/Panda";
import { ProgressBar } from "@/components/ui/Progress";
import { ArrowRight, Volume2, Check } from "lucide-react";
import { playChinese } from "@/lib/audio";
import { ListeningQuiz } from "./ListeningQuiz";
import { buildListeningQuiz } from "@/lib/listening";


type Step =
  | { kind: "intro"; charIdx: number }
  | { kind: "stroke"; charIdx: number }
  | { kind: "guided"; charIdx: number }
  | { kind: "recall"; charIdx: number }
  | { kind: "practice"; charIdx: number; taskIdx: 0 | 1 }
  | { kind: "listen"; charIdx: number }
  | { kind: "words" }
  | { kind: "sentence" }
  | { kind: "imageMatch" }
  | { kind: "grammar" }
  | { kind: "summary" };

type StepKind = Step["kind"];

// Stage labels per §8 of the Minzi spec. The lesson runner shows the
// stage name at the top of the screen instead of «1 / 52» — because
// 1 / 52 is flashcard energy and we don't do that.
const STAGE_LABEL: Record<StepKind, string> = {
  intro: "Знакомство",
  stroke: "Порядок черт",
  guided: "Обведите",
  recall: "Напишите по памяти",
  practice: "Контекст",
  listen: "Услышьте",
  words: "Слова урока",
  sentence: "Соберите фразу",
  imageMatch: "Найдите образ",
  grammar: "Грамматика",
  summary: "Иероглиф у вас",
};

interface Props {
  lesson: Lesson;
  characters: CharRecord[]; // Resolved CharRecord[] for the lesson's hanzi
  pool: CharRecord[]; // Distractor pool for practice options
  onExit: () => void;
}

export function LessonFlow({ lesson, characters, pool, onExit }: Props) {
  const recordOutcome = useProgress((s) => s.recordOutcome);
  const completeLesson = useProgress((s) => s.completeLesson);

  /* Studied chars = everything the user has met by the time they reach
     this lesson, *including* the new chars in this lesson itself.
     Strict ordering: (level ascending, index ascending) matches the
     in-app lesson navigation. Used to gate sentence patterns so we
     never quiz on chars the user hasn't seen. */
  const studied = useMemo(() => {
    const s = new Set<string>();
    for (const l of ALL_LESSONS) {
      if (
        l.level < lesson.level ||
        (l.level === lesson.level && l.index <= lesson.index)
      ) {
        for (const c of l.characters) s.add(c);
      }
    }
    return s;
  }, [lesson]);

  /* Per-lesson conditional content: vocabulary, one sentence pattern,
     one image-match round. All three are optional — the lesson flow
     simply skips a stage when its source data is empty. */
  const lessonWords: WordRecord[] = useMemo(
    () => getWordsForLesson(lesson.id),
    [lesson.id]
  );

  const sentencePattern: SentencePattern | null = useMemo(() => {
    for (const ch of lesson.characters) {
      const matches = patternsFor(ch, studied);
      if (matches.length > 0) return matches[0];
    }
    return null;
  }, [lesson, studied]);

  const imageQuiz: { entry: ImageMatchEntry; options: string[] } | null = useMemo(() => {
    for (const ch of lesson.characters) {
      const q = buildImageQuiz(ch);
      if (q) return q;
    }
    return null;
  }, [lesson]);

  /* Build the entire step list up-front so we know `totalSteps`, can
     index by position, and the summary screen can render an honest
     checklist of what the user actually went through. */
  const steps: Step[] = useMemo(() => {
    const arr: Step[] = [];
    for (let i = 0; i < characters.length; i++) {
      arr.push({ kind: "intro", charIdx: i });
      arr.push({ kind: "stroke", charIdx: i });
      arr.push({ kind: "guided", charIdx: i });
      arr.push({ kind: "recall", charIdx: i });
      arr.push({ kind: "practice", charIdx: i, taskIdx: 0 });
      arr.push({ kind: "listen", charIdx: i });
    }
    if (lessonWords.length > 0) arr.push({ kind: "words" });
    if (sentencePattern) arr.push({ kind: "sentence" });
    if (imageQuiz) arr.push({ kind: "imageMatch" });
    if (lesson.grammarNote) arr.push({ kind: "grammar" });
    arr.push({ kind: "summary" });
    return arr;
  }, [characters, lessonWords, sentencePattern, imageQuiz, lesson.grammarNote]);

  const totalSteps = steps.length;
  const [stepIdx, setStepIdx] = useState(0);

  // Per-step selected grapheme index → drives the static stroke highlight on
  // the intro card. Reset whenever we leave the intro step / switch chars.
  const [selectedGrapheme, setSelectedGrapheme] = useState<number | null>(null);
  const [exerciseDone, setExerciseDone] = useState(false);

  const step: Step = steps[Math.min(stepIdx, totalSteps - 1)];

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
    void playChinese(text);
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4 sm:px-6">
      {/* Top bar — stage name as the dominant label, faint progress bar 
          beneath. No «1 / 52» counter (per §19.2). */}
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {(step.kind === "intro" ||
            step.kind === "stroke" ||
            step.kind === "words" ||
            step.kind === "grammar" ||
            step.kind === "summary") ? (
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
          <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
            {STAGE_LABEL[step.kind]}
          </span>
        </div>
        <ProgressBar value={stepIdx + 1} max={totalSteps} />
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
            <div className="pinyin text-[var(--foreground-muted)]">
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
            <div className="pinyin text-[var(--foreground-muted)]">
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
            <div className="pinyin text-[var(--foreground-muted)]">
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

      {step.kind === "listen" && (
        <Card className="p-8 sm:p-10 flex flex-col items-center gap-5 float-up">
          <ListeningQuiz
            key={`listen-${characters[step.charIdx].hanzi}`}
            target={characters[step.charIdx]}
            options={buildListeningQuiz(characters[step.charIdx], pool)}
            onAnswer={(correct) => {
              recordOutcome(
                characters[step.charIdx].hanzi,
                correct ? "good" : "again"
              );
              setTimeout(next, 250);
            }}
          />
        </Card>
      )}

      {step.kind === "words" && (
        <Card className="p-6 sm:p-8 flex flex-col gap-5 float-up">
          <WordList words={lessonWords} />
          <div className="flex justify-center">
            <Button onClick={next} size="lg">
              Дальше <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {step.kind === "sentence" && sentencePattern && (
        <Card className="p-6 sm:p-8 flex flex-col items-center gap-5 float-up">
          <SentenceBuilder
            key={`sentence-${sentencePattern.id}`}
            pattern={sentencePattern}
            onDone={() => setTimeout(next, 300)}
          />
        </Card>
      )}

      {step.kind === "imageMatch" && imageQuiz && (
        <Card className="p-6 sm:p-8 flex flex-col items-center gap-5 float-up">
          <ImageMatch
            key={`image-${imageQuiz.entry.hanzi}`}
            entry={imageQuiz.entry}
            options={imageQuiz.options}
            onAnswer={(correct) => {
              recordOutcome(
                imageQuiz.entry.hanzi,
                correct ? "good" : "again"
              );
              setTimeout(next, 400);
            }}
          />
        </Card>
      )}

      {step.kind === "grammar" && lesson.grammarNote && (
        <Card className="p-8 sm:p-10 flex flex-col gap-4 float-up">
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
          {/* Per §8 stage 8 (Settle) + §18 (session close): no 
              confetti, no «Excellent!» — just ownership and a quiet
              recap of what the user actually did this session. */}
          <Panda mood="resting" size={140} />
          <div className="flex items-baseline gap-3 flex-wrap justify-center">
            {characters.map((c) => (
              <span
                key={c.hanzi}
                className="hanzi text-5xl text-[var(--ink)]"
              >
                {c.hanzi}
              </span>
            ))}
          </div>
          <p className="text-[var(--foreground-muted)] max-w-md leading-relaxed">
            Сегодня вы записали {characters.length}{" "}
            {plural(characters.length, "иероглиф", "иероглифа", "иероглифов")}.
            {" "}Они теперь живут в вашей библиотеке.
          </p>
          <SummaryChecklist
            charCount={characters.length}
            wordCount={lessonWords.length}
            sawSentence={sentencePattern !== null}
            sawImageMatch={imageQuiz !== null}
            sawGrammar={Boolean(lesson.grammarNote)}
          />
          <p className="text-sm text-[var(--foreground-soft)] max-w-md">
            До завтра.
          </p>
          <Button onClick={finish} size="lg">
            Закрыть
          </Button>
        </Card>
      )}
    </div>
  );
}

function SummaryChecklist({
  charCount,
  wordCount,
  sawSentence,
  sawImageMatch,
  sawGrammar,
}: {
  charCount: number;
  wordCount: number;
  sawSentence: boolean;
  sawImageMatch: boolean;
  sawGrammar: boolean;
}) {
  const items: string[] = [
    `Написали ${charCount} ${plural(charCount, "иероглиф", "иероглифа", "иероглифов")}`,
    `Услышали и узнали ${charCount} на слух`,
  ];
  if (wordCount > 0) {
    items.push(
      `Увидели ${wordCount} ${plural(wordCount, "слово", "слова", "слов")} с этими иероглифами`
    );
  }
  if (sawSentence) items.push("Собрали фразу из слов");
  if (sawImageMatch) items.push("Нашли иероглиф по образу");
  if (sawGrammar) items.push("Прошли грамматику урока");

  return (
    <ul className="w-full max-w-md flex flex-col gap-2 text-left">
      {items.map((text, i) => (
        <li
          key={i}
          className="flex items-start gap-3 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border)]"
        >
          <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--green-soft)] text-[var(--green-deep)] flex items-center justify-center mt-0.5">
            <Check size={12} strokeWidth={3} />
          </span>
          <span className="text-sm text-[var(--foreground)] leading-snug">
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

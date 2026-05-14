"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ALL_CHARACTERS, ALL_LESSONS, getLesson } from "@/lib/characters";
import { LessonFlow } from "@/components/learn/LessonFlow";

export default function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = use(params);
  const router = useRouter();
  const lesson = getLesson(lessonId) ?? ALL_LESSONS[0];

  const characters = useMemo(
    () =>
      lesson.characters
        .map((h) => ALL_CHARACTERS.find((c) => c.hanzi === h))
        .filter(Boolean) as typeof ALL_CHARACTERS,
    [lesson]
  );

  const pool = useMemo(
    () =>
      // Distractors must have a real Russian translation so the multiple-choice
      // options never leak English text. Limit to HSK1+HSK2 to keep distractors
      // similar in difficulty.
      ALL_CHARACTERS.filter(
        (c) =>
          c.level <= Math.max(lesson.level, 2) &&
          c.pinyin &&
          c.meaningsRu &&
          c.meaningsRu.length > 0
      ),
    [lesson.level]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <LessonFlow
        lesson={lesson}
        characters={characters}
        pool={pool}
        onExit={() => router.push("/learn")}
      />
    </div>
  );
}

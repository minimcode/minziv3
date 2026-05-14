"use client";

import { useState } from "react";
import { StrokeAnimation } from "@/components/learn/StrokeAnimation";
import { Card } from "@/components/ui/Card";
import { Panda } from "@/components/ui/Panda";
import { Settings, ArrowRight, Volume2 } from "lucide-react";

// Stage names used on the lesson runner, per §8 of the Minzi spec.
const STAGE = "Обведите";

export function HeroDemo() {
  const [strokeCount, setStrokeCount] = useState(0);

  return (
    <div className="relative">
      <Card className="p-5 sm:p-6 max-w-[480px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
              {STAGE}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <button className="btn btn-ghost h-8 w-8 p-0" aria-label="Настройки">
              <Settings size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start gap-5">
          <StrokeAnimation
            hanzi="你"
            size={220}
            autoplay
            onReady={(n) => setStrokeCount(n)}
          />
          <div className="flex flex-col gap-2 min-w-[140px]">
            <div className="flex items-center gap-2">
              <span className="pinyin text-2xl">nǐ</span>
              <button className="btn btn-ghost h-8 w-8 p-0" aria-label="Произнести">
                <Volume2 size={14} />
              </button>
            </div>
            <div className="text-[var(--foreground-muted)] text-sm">
              ты, вы
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-soft)] mt-3">
              Порядок черт
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
              {Array.from({ length: Math.max(7, strokeCount) }).map((_, i) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-medium border border-[var(--border)] text-[var(--foreground-muted)]"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <button className="btn btn-ghost h-10 w-10 p-0" aria-label="Назад">
            <ArrowRight size={16} className="rotate-180" />
          </button>
          <button className="btn btn-primary">
            Далее <ArrowRight size={16} />
          </button>
        </div>
      </Card>

      {/* Decorative panda peeking from bottom right */}
      <div className="absolute -bottom-4 -right-2 sm:-right-8 hidden md:block pointer-events-none">
        <Panda mood="resting" size={120} />
      </div>
    </div>
  );
}

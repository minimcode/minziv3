"use client";

import { useState } from "react";
import { StrokeAnimation } from "@/components/learn/StrokeAnimation";
import { Card } from "@/components/ui/Card";
import { ArrowRight, RotateCcw, Play, Volume2, Lightbulb } from "lucide-react";

// Stage names used on the lesson runner, per §8 of the Minzi spec.
const STAGE = "Обведите";
const STROKE_COUNT = 7;

export function HeroDemo() {
  const [strokeCount, setStrokeCount] = useState(STROKE_COUNT);

  return (
    <div className="relative w-full max-w-[640px] mx-auto">
      {/* Desktop lesson card */}
      <Card className="relative z-10 p-6 sm:p-7 bg-[var(--surface)]">
        <div className="flex items-center justify-between mb-5">
          <span className="text-[13px] font-medium text-[var(--foreground)]">
            {STAGE}
          </span>
          <button
            className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Произнести"
          >
            <Volume2 size={16} strokeWidth={1.7} />
          </button>
        </div>

        <div className="grid grid-cols-[1fr_minmax(0,200px)] items-start gap-6">
          <div className="cali-grid border border-[var(--border)] rounded-xl bg-[var(--surface)]">
            <StrokeAnimation
              hanzi="你"
              size={240}
              autoplay
              onReady={(n) => setStrokeCount(n || STROKE_COUNT)}
            />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <div className="pinyin text-[28px] font-display tracking-tight leading-none text-[var(--foreground)]">
                nǐ
              </div>
              <div className="mt-2 text-[15px] font-medium text-[var(--green-deep)]">
                ты, вы
              </div>
            </div>
            <div className="rounded-lg bg-[var(--green-soft)]/55 border border-[var(--green-soft)] px-3 py-2.5 flex gap-2 items-start">
              <Lightbulb
                size={13}
                strokeWidth={1.8}
                className="text-[var(--green-deep)] mt-0.5 shrink-0"
              />
              <div className="text-[12px] leading-[1.5] text-[var(--foreground)]">
                <span className="font-medium">ТЫ</span> — когда обращаетесь к одному
                человеку
                <br />
                <span className="font-medium">ВЫ</span> — когда обращаетесь к
                нескольким людям
              </div>
            </div>
            <div className="mt-1">
              <div className="text-[12px] text-[var(--foreground-muted)] mb-1.5">
                Порядок черт
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: Math.max(STROKE_COUNT, strokeCount) }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium border border-[var(--border)] text-[var(--foreground-muted)] bg-[var(--surface)]"
                    >
                      {i + 1}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <div className="flex items-center gap-2">
            <button
              className="h-9 w-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] transition-colors"
              aria-label="Сначала"
            >
              <RotateCcw size={14} strokeWidth={1.7} />
            </button>
            <button
              className="h-9 w-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] transition-colors"
              aria-label="Воспроизвести"
            >
              <Play size={13} strokeWidth={1.7} />
            </button>
          </div>
          <button className="btn btn-primary h-11 px-6 text-[14px]">
            Далее <ArrowRight size={14} />
          </button>
        </div>
      </Card>

      {/* Phone mockup tucked behind the desktop card on the right */}
      <PhoneMockup className="hidden md:block absolute z-0 -right-2 lg:-right-6 -bottom-12 w-[180px] lg:w-[210px] rotate-[3deg]" />
    </div>
  );
}

function PhoneMockup({ className }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none select-none ${className ?? ""}`}
      aria-hidden
    >
      <div className="rounded-[34px] bg-[#1c231e] p-2 shadow-[0_18px_40px_-16px_rgba(20,22,18,0.35),0_6px_14px_-10px_rgba(20,22,18,0.18)]">
        <div className="rounded-[28px] bg-[var(--surface)] aspect-[9/19] overflow-hidden relative px-3 pt-4 pb-3 flex flex-col">
          {/* Dynamic island */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-3.5 w-14 rounded-full bg-[#1c231e]" />

          <div className="text-center mt-2 mb-1">
            <div className="text-[8px] text-[var(--foreground-muted)]">2 / 6</div>
            <div className="text-[10px] font-medium text-[var(--foreground)] mt-1">
              Обведите
            </div>
          </div>

          <div className="cali-grid border border-[var(--border)] rounded-md aspect-square flex items-center justify-center">
            <span className="hanzi text-[44px] leading-none text-[var(--ink)]">
              你
            </span>
          </div>

          <div className="text-center mt-2">
            <div className="pinyin text-[14px] font-display leading-none">nǐ</div>
            <div className="text-[9px] text-[var(--green-deep)] mt-1">ты, вы</div>
          </div>

          <div className="mt-1.5 flex-1 flex flex-col">
            <div className="text-[7px] text-[var(--foreground-muted)] mb-1">
              Порядок черт
            </div>
            <div className="flex gap-0.5 flex-wrap">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-3 w-3 rounded-full flex items-center justify-center text-[6px] font-medium border border-[var(--border)] text-[var(--foreground-muted)]"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-1.5 h-7 rounded-md bg-[var(--red)] text-white flex items-center justify-center text-[9px] font-medium">
            Далее →
          </div>
        </div>
      </div>
    </div>
  );
}

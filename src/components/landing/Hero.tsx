import Link from "next/link";
import Image from "next/image";
import { HeroDemo } from "./HeroDemo";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle bamboo branch on the right edge of the hero */}
      <Image
        src="/bg/bg_bamboo_branch.png"
        alt=""
        width={520}
        height={520}
        className="absolute right-[-90px] top-[6%] w-[360px] lg:w-[440px] opacity-50 pointer-events-none select-none hidden md:block z-0"
        priority={false}
      />
      {/* Ink-wash mountains in the bottom-left corner */}
      <Image
        src="/bg/bg_mist_pine.png"
        alt=""
        width={520}
        height={360}
        className="absolute left-[-30px] bottom-[-20px] w-[300px] lg:w-[420px] opacity-50 pointer-events-none select-none hidden md:block z-0"
        priority={false}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 pt-14 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-12 lg:gap-16 items-center">
        <div className="animate-fade-in-up">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--foreground-soft)] mb-5 font-medium">
            пишите &middot; понимайте &middot; запоминайте
          </div>
          <h1 className="font-display font-medium tracking-[-0.02em] leading-[1.05] text-[2.6rem] sm:text-[3.1rem] lg:text-[3.6rem]">
            Учите иероглифы
            <br />
            через письмо.
            <br />
            <span className="text-[var(--green-deep)] italic">
              Запоминайте надолго
            </span>
          </h1>
          <p className="mt-6 text-[var(--foreground-muted)] max-w-[480px] text-[15.5px] leading-[1.65]">
            Minzi помогает освоить китайские иероглифы с помощью активного
            письма, умных повторений и контекстных примеров.
          </p>
          <div className="mt-8 flex items-center gap-5 flex-wrap">
            <Link
              href="/learn"
              className="btn btn-primary h-12 px-7 text-[15px] relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Начать бесплатно
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
              <span className="absolute inset-0 animate-shimmer pointer-events-none" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {AVATARS.map((a, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-[var(--background)] flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ background: a.bg }}
                  >
                    {a.initial}
                  </div>
                ))}
              </div>
              <div className="text-[13.5px] leading-tight text-[var(--foreground-muted)]">
                <div className="font-medium text-[var(--foreground)]">
                  12 000+ учеников
                </div>
                <div className="text-[var(--foreground-soft)]">уже с нами</div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative">
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}

const AVATARS: { initial: string; bg: string }[] = [
  { initial: "А", bg: "#a8b89a" },
  { initial: "Д", bg: "#c4805a" },
  { initial: "М", bg: "#7f9b8d" },
  { initial: "Е", bg: "#b48a6a" },
];

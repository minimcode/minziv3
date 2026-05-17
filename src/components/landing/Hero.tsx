import Link from "next/link";
import Image from "next/image";
import { HeroDemo } from "./HeroDemo";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Image
        src="/bamboo/bamboo_2.png"
        alt=""
        width={120}
        height={300}
        className="absolute -left-4 top-[12%] w-20 opacity-[0.07] hidden lg:block pointer-events-none select-none"
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
        <div className="animate-fade-in-up">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--foreground-soft)] mb-4 font-medium">
            пишите &middot; понимайте &middot; запоминайте
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-display font-medium tracking-[-0.025em] leading-[1.08]">
            Учите иероглифы
            <br />
            через письмо.
            <br />
            <span className="text-[var(--green-deep)]">
              Запоминайте надолго
            </span>
          </h1>
          <p className="mt-6 text-[var(--foreground-muted)] max-w-md text-[15px] leading-[1.65]">
            Правильный порядок черт, активная практика и умные повторения,
            чтобы знания остались с вами.
          </p>
          <div className="mt-7 flex items-center gap-3 flex-wrap">
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
          </div>
          <div className="mt-7 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-[var(--background)] bg-[var(--surface-3)]"
                />
              ))}
            </div>
            <div className="text-sm text-[var(--foreground-muted)]">
              <span className="font-medium text-[var(--foreground)]">
                12 000+
              </span>{" "}
              учеников
            </div>
          </div>
        </div>
        <div className="relative animate-float">
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}

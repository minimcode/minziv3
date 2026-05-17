import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function CTABand() {
  return (
    <section className="py-10 sm:py-14">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-xl bg-[#152e20] min-h-[280px]">
          {/* Subtle radial light */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_50%,oklch(0.35_0.04_145_/_0.25),transparent_55%)]" />

          {/* Panda integrated on right */}
          <Image
            src="/panda/sitting_near_rock.png"
            alt=""
            width={280}
            height={280}
            className="absolute right-4 sm:right-10 lg:right-16 bottom-0 w-[140px] sm:w-[180px] lg:w-[240px] opacity-90 pointer-events-none select-none"
          />

          {/* Content */}
          <div className="relative z-10 p-8 sm:p-10 lg:p-12 flex flex-col gap-4 max-w-md">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-medium tracking-[-0.02em] leading-[1.1] text-white">
              Начните учить иероглифы
              <br />
              <span className="text-[oklch(0.82_0.12_150)]">правильно</span>{" "}
              уже сегодня
            </h3>
            <p className="text-[oklch(0.70_0.03_145)] text-sm leading-relaxed max-w-sm">
              Бесплатно, без карты, доступно прямо сейчас.
            </p>
            <div className="flex items-center gap-4 mt-1">
              <Link
                href="/learn"
                className="btn btn-primary h-11 px-6 text-sm relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Начать бесплатно
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="absolute inset-0 animate-shimmer pointer-events-none" />
              </Link>
              <span className="text-[oklch(0.55_0.02_145)] text-xs hidden sm:block">
                12 000+ учеников
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

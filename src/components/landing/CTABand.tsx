import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function CTABand() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#1a3f2a] p-10 sm:p-14 md:p-16">
          <Image
            src="/bg/bg_dark_bamboo.png"
            alt=""
            fill
            className="object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a3f2a]/90 to-[#1a3f2a]/50" />

          <div className="relative grid grid-cols-1 md:grid-cols-[1.2fr_auto] gap-8 items-center">
            <div>
              <h3 className="text-3xl md:text-5xl font-display font-medium tracking-tighter leading-none text-white">
                Начните учить иероглифы
                <br />
                <span className="text-[#a9d8b4]">правильно</span> уже сегодня
              </h3>
              <p className="mt-4 text-white/70 text-base max-w-lg leading-relaxed">
                Бесплатно, без карты, доступно прямо сейчас.
              </p>
            </div>
            <Link
              href="/learn"
              className="btn btn-primary h-13 px-8 text-base relative overflow-hidden group self-start md:self-center"
            >
              <span className="relative z-10 flex items-center gap-2">
                Начать бесплатно
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
              <span className="absolute inset-0 animate-shimmer pointer-events-none" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

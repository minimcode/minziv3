import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function CTABand() {
  return (
    <section className="relative overflow-hidden">
      {/* Mountain + sun illustration on the right.
          The source asset has a stray "ФОНЫ" label baked into the top edge —
          we wrap it in a clipped container and push the image down with a
          negative top so only the clean mountain/pagoda/sun area remains. */}
      <div className="absolute right-0 bottom-0 w-[560px] lg:w-[760px] max-w-[60%] aspect-[16/9] overflow-hidden pointer-events-none">
        <Image
          src="/bg/bg_mountain_sun.png"
          alt=""
          width={900}
          height={520}
          className="absolute left-0 right-0 -top-[28%] w-full h-auto select-none"
          priority={false}
        />
      </div>
      {/* Bamboo grove on the bottom-left.
          The bamboo sprite has a stray "УК" label in the upper-left corner —
          clip and reposition. */}
      <div className="absolute left-2 bottom-0 w-[140px] lg:w-[180px] h-[340px] lg:h-[420px] overflow-hidden pointer-events-none hidden md:block">
        <Image
          src="/bamboo/bamboo_3.png"
          alt=""
          width={300}
          height={520}
          className="absolute -left-2 bottom-0 w-[160px] lg:w-[200px] h-auto select-none"
          priority={false}
        />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12 py-20 sm:py-28 lg:py-32">
        <div className="max-w-[640px] lg:pl-40">
          <h3 className="font-display font-medium tracking-[-0.02em] leading-[1.1] text-[2.2rem] sm:text-[2.6rem] lg:text-[3rem]">
            Начните учить иероглифы
            <br />
            <span className="text-[var(--green-deep)] italic">
              правильно уже сегодня
            </span>
          </h3>
          <p className="mt-5 text-[var(--foreground-muted)] text-[15px] leading-[1.65] max-w-[440px]">
            Бесплатно, без карты, доступно прямо сейчас.
          </p>
          <div className="mt-7 flex items-center gap-4 flex-wrap">
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
        </div>
      </div>
    </section>
  );
}

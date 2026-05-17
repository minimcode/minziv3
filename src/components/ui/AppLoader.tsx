"use client";

/**
 * Calm 子 stroke-order splash shown during the very first paint —
 * specifically the window between HTML arriving and React hydration
 * finishing. Replaces the brief "black screen" the cold start used to
 * show on mobile Safari / PWA launch.
 *
 * Design notes:
 *  - SSR-rendered, so it's part of the initial HTML and visible *before*
 *    JS executes.
 *  - Plain inline SVG with hard-coded 子 paths from MakeMeAHanzi — no
 *    network roundtrip, no dependency on hanzi-writer to first-paint.
 *  - Strokes "write" in order via clip-path animations; the whole cycle
 *    loops while the splash is visible.
 *  - On mount we wait one frame, then fade out and unmount. The fade-out
 *    is the *only* JS-driven behaviour, so even if hydration is slow the
 *    user still sees a calm writing 子 instead of a black screen.
 *  - `prefers-reduced-motion`: animation is suppressed via CSS; the 子
 *    just sits there breathing softly.
 *  - Dark mode: stroke colour is `var(--ink)` which already adapts.
 */
import { useEffect, useState } from "react";

// MakeMeAHanzi paths for 子 — fetched once at authoring time from
// https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/子.json and inlined
// so the splash never makes a network request. Coordinates use the
// standard 1024×1024 viewbox with the Y-flip transform applied below.
const ZI_STROKES = [
  "M 544 561 Q 575 580 648 638 Q 679 666 700 671 Q 737 683 739 698 Q 740 708 705 746 Q 672 782 661 780 Q 657 783 644 778 Q 575 748 344 719 Q 323 720 309 722 Q 290 726 283 715 Q 280 708 288 697 Q 298 684 322 666 Q 343 650 354 650 Q 364 649 384 662 Q 420 690 607 732 Q 632 738 637 735 Q 643 731 642 723 Q 642 714 543 589 Q 534 580 529 573 C 509 550 519 545 544 561 Z",
  "M 529 573 Q 505 588 486 592 Q 474 596 466 591 Q 462 587 474 574 Q 495 544 508 451 L 513 407 Q 541 169 492 90 Q 489 83 482 81 Q 467 77 356 100 Q 349 100 346 97 Q 345 93 354 85 Q 429 30 470 -13 Q 483 -26 492 -24 Q 505 -23 527 -1 Q 575 44 576 136 Q 583 239 562 411 L 557 457 Q 551 505 549 542 Q 549 554 544 561 L 529 573 Z",
  "M 508 451 Q 499 452 299 429 Q 227 419 121 418 Q 108 418 106 406 Q 105 393 124 378 Q 142 365 174 353 Q 186 349 204 357 Q 222 363 297 375 Q 393 397 513 407 L 562 411 Q 769 430 888 417 Q 937 417 940 418 Q 940 421 942 421 Q 949 434 937 447 Q 864 513 800 491 Q 739 479 675 469 Q 605 463 557 457 L 508 451 Z",
];

export function AppLoader() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // One frame for the browser to paint the splash, then start fading
    // out so the actual app shell becomes visible underneath.
    const fadeIn = requestAnimationFrame(() => setLeaving(true));
    // Match the CSS fade-out duration so we can fully unmount and stop
    // animating without blocking interactions.
    const remove = window.setTimeout(() => setGone(true), 520);
    return () => {
      cancelAnimationFrame(fadeIn);
      clearTimeout(remove);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className="app-splash"
      data-leaving={leaving ? "true" : "false"}
      aria-hidden="true"
    >
      <div className="app-splash-inner">
        <svg
          className="app-splash-zi"
          viewBox="0 0 1024 1024"
          width="180"
          height="180"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="matrix(1 0 0 -1 0 900)">
            {ZI_STROKES.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="var(--ink, #1a1c18)"
                stroke="none"
                style={{
                  animationDelay: `${i * 460}ms`,
                }}
                className="app-splash-stroke"
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

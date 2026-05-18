"use client";

/**
 * Swipe-driven review card stack.
 *
 * Behaviour (matches §19 calm philosophy — no shame, no celebration):
 *  - Top card is dragged horizontally.
 *  - Right swipe → "remember"  → jade ink glow grows with distance.
 *  - Left swipe  → "forget"    → warm terracotta wash grows with distance.
 *  - Calm motion: ±2° tilt cap, 1→1.02 scale bump, soft spring return.
 *  - Thresholds: |x| < 25% viewport → nothing.
 *                25–60%             → preview glow + gesture hint fades in.
 *                ≥ 60% or |v| > 800  → commit, fly away.
 *  - Commit → light haptic (10 ms), card flies off-screen in
 *    {@link FLY_DURATION_MS} ms, parent advances the queue.
 *  - Below the top card, the next card peeks at scale 0.96 / opacity 0.7
 *    so the user feels continuity. When the top commits and the parent
 *    moves to the next index, the peek "rises" into top position via a
 *    smooth scale/opacity animation.
 *
 * Hold-to-reveal:
 *  - Pinyin / meaning are hidden by default.
 *  - Tap the card → reveals. Press Space/Enter → reveals (keyboard a11y).
 *  - State resets on every new top card.
 *
 * Accessibility:
 *  - Keyboard: ← (forget), → (remember), Space/Enter (reveal).
 *  - prefers-reduced-motion: no rotation/scale, no fly-away — commit instant.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";
import { Volume2 } from "lucide-react";
import { getChar, meaningRu, type CharRecord } from "@/lib/characters";
import { speakChinese } from "@/lib/tts";

export type SwipeOutcome = "remember" | "forget";

type Props = {
  /** Full session queue, as hanzi strings. The stack resolves each
   *  string to a CharRecord via `getChar`. */
  queue: string[];
  /** Index of the current top card. */
  index: number;
  /** Called with the committed hanzi and the outcome. The parent should
   *  advance its own index in response. */
  onCommit: (hanzi: string, outcome: SwipeOutcome) => void;
};

const COMMIT_FRACTION = 0.6;
const PREVIEW_FRACTION = 0.25;
const VELOCITY_COMMIT = 800;
const FLY_DISTANCE_PX = 1100;
const FLY_DURATION_MS = 220;

function useViewportWidthSafe(defaultW = 360): number {
  const [w, setW] = useState(defaultW);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return w;
}

function vibrate(ms: number) {
  if (typeof navigator === "undefined") return;
  // navigator.vibrate is unavailable on iOS / desktops; this is a no-op
  // there and just falls through silently.
  const v = (navigator as Navigator & { vibrate?: (n: number) => boolean })
    .vibrate;
  if (typeof v === "function") {
    try {
      v.call(navigator, ms);
    } catch {
      // Some browsers throw if the doc isn't focused; silently ignore.
    }
  }
}

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  // SSR doesn't know the user's preference. Default to false (animations
  // on) — the client will reconcile on mount.
  return false;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

export function SwipeStack({ queue, index, onCommit }: Props) {
  const vw = useViewportWidthSafe();
  const commitThreshold = Math.max(80, vw * COMMIT_FRACTION);
  const previewThreshold = Math.max(40, vw * PREVIEW_FRACTION);
  const reducedMotion = usePrefersReducedMotion();

  const x = useMotionValue(0);

  // Calm tilt cap: ±2° at full viewport drag. Prevents Tinder-style flop.
  const tilt = useTransform(
    x,
    [-vw, 0, vw],
    reducedMotion ? [0, 0, 0] : [-2, 0, 2],
  );
  // Subtle tactile bump: 1.00 → 1.02 as the card approaches commit. The
  // top card lifts gently off the peek card while you drag.
  const cardScale = useTransform(x, (v) => {
    if (reducedMotion) return 1;
    const t = Math.min(1, Math.abs(v) / commitThreshold);
    return 1 + t * 0.02;
  });
  // Glow derives from x; we render two layered glows (right=jade, left=red)
  // and modulate opacity. Sharp ramp toward commit so the bloom is visible.
  const rightGlow = useTransform(
    x,
    [0, previewThreshold * 0.6, previewThreshold, commitThreshold],
    [0, 0.35, 0.7, 1],
  );
  const leftGlow = useTransform(
    x,
    [-commitThreshold, -previewThreshold, -previewThreshold * 0.6, 0],
    [1, 0.7, 0.35, 0],
  );
  // Aura ring on the card itself — animates via boxShadow so it bleeds
  // beyond the card outline like ink on rice paper.
  const cardShadow = useTransform(x, (v) => {
    const t = Math.min(1, Math.abs(v) / commitThreshold);
    if (t < 0.02) return "var(--shadow-card, 0 1px 2px rgba(0,0,0,0.06))";
    if (v >= 0) {
      // jade ink (var(--green) territory) — soft outer bloom + faint inner kiss
      return (
        `0 0 ${20 + t * 70}px ${4 + t * 8}px rgba(127, 179, 140, ${0.18 + t * 0.42}),` +
        `inset 0 0 ${30 + t * 50}px rgba(127, 179, 140, ${t * 0.28})`
      );
    }
    // warm terracotta — slightly less saturated so it never reads as alarm.
    return (
      `0 0 ${20 + t * 70}px ${4 + t * 8}px rgba(217, 114, 102, ${0.16 + t * 0.36}),` +
      `inset 0 0 ${30 + t * 50}px rgba(217, 114, 102, ${t * 0.22})`
    );
  });
  const hintRight = useTransform(x, [0, previewThreshold * 0.8], [0.4, 1]);
  const hintLeft = useTransform(x, [-previewThreshold * 0.8, 0], [1, 0.4]);

  const topHanzi = queue[index] ?? null;
  const nextHanzi = queue[index + 1] ?? null;
  const top: CharRecord | null = topHanzi ? (getChar(topHanzi) ?? null) : null;
  const next: CharRecord | null = nextHanzi ? (getChar(nextHanzi) ?? null) : null;

  const [committingDir, setCommittingDir] = useState<-1 | 0 | 1>(0);
  const [revealed, setRevealed] = useState(false);
  // Tracks the most recent committed hanzi so the rising peek card doesn't
  // re-run its enter animation on prop refreshes that didn't change index.
  const lastTopHanzi = useRef<string | null>(null);

  // Reset reveal + position when a new top card arrives.
  useEffect(() => {
    if (top?.hanzi !== lastTopHanzi.current) {
      lastTopHanzi.current = top?.hanzi ?? null;
      setRevealed(false);
      x.set(0);
    }
  }, [top?.hanzi, x]);

  // Haptic gate: fire only once when crossing the preview threshold in
  // either direction so we don't spam vibrations during every micro-drag.
  const hapticPrimedRef = useRef<-1 | 0 | 1>(0);
  useEffect(() => {
    const unsubscribe = x.on("change", (v) => {
      const dir: -1 | 0 | 1 =
        v > previewThreshold ? 1 : v < -previewThreshold ? -1 : 0;
      if (dir !== 0 && hapticPrimedRef.current !== dir) {
        hapticPrimedRef.current = dir;
        vibrate(6);
      } else if (dir === 0 && hapticPrimedRef.current !== 0) {
        // Reset when card returns to rest so the next entry will re-fire.
        hapticPrimedRef.current = 0;
      }
    });
    return () => unsubscribe();
  }, [x, previewThreshold]);

  const commit = useCallback(
    (direction: -1 | 1) => {
      if (committingDir !== 0 || !top) return;
      setCommittingDir(direction);
      vibrate(12);
      if (reducedMotion) {
        // Skip the fly-away; commit synchronously. Parent advances and
        // useEffect above resets revealed/x for the new top.
        setCommittingDir(0);
        onCommit(top.hanzi, direction === 1 ? "remember" : "forget");
        return;
      }
      const committed = top;
      void animate(x, direction * FLY_DISTANCE_PX, {
        duration: FLY_DURATION_MS / 1000,
        ease: [0.16, 1, 0.3, 1],
      }).then(() => {
        setCommittingDir(0);
        onCommit(committed.hanzi, direction === 1 ? "remember" : "forget");
      });
    },
    [committingDir, top, x, reducedMotion, onCommit],
  );

  const onDragEnd = useCallback(
    (_e: unknown, info: PanInfo) => {
      if (!top || committingDir !== 0) return;
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      const past = Math.abs(offset) > commitThreshold;
      const fast = Math.abs(velocity) > VELOCITY_COMMIT && Math.abs(offset) > 40;
      if (past || fast) {
        commit(offset > 0 ? 1 : -1);
      } else {
        // Soft, slightly under-damped spring — feels tactile without bouncing.
        void animate(x, 0, { type: "spring", stiffness: 260, damping: 24 });
      }
    },
    [top, committingDir, commitThreshold, commit, x],
  );

  // Keyboard fallback.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!top || committingDir !== 0) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        commit(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        commit(-1);
      } else if ((e.key === " " || e.key === "Enter") && !revealed) {
        e.preventDefault();
        setRevealed(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [top, committingDir, revealed, commit]);

  if (!top) return null;

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: 420 }}>
      <div className="relative h-[440px] sm:h-[460px]">
        {/* Peek card (next) — under the top, scaled / faded so the user
            sees the stack has depth. */}
        {next && committingDir === 0 && (
          <div
            aria-hidden
            className="absolute inset-x-4 top-3 bottom-10"
            style={{ zIndex: 1 }}
          >
            <CardFace
              char={next}
              revealed={false}
              dim
              tabIndex={-1}
            />
          </div>
        )}

        {/* Top card */}
        <motion.div
          key={top.hanzi}
          className="absolute inset-x-0 top-0 bottom-10 mx-auto rounded-2xl"
          style={{
            x,
            rotate: tilt,
            scale: cardScale,
            boxShadow: cardShadow,
            zIndex: 2,
            touchAction: "pan-y",
            willChange: "transform, box-shadow",
          }}
          drag={committingDir === 0 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={onDragEnd}
          initial={
            reducedMotion
              ? false
              : { scale: 0.96, opacity: 0.7, y: 6 }
          }
          animate={
            committingDir === 0
              ? { scale: 1, opacity: 1, y: 0 }
              : {}
          }
          transition={{
            scale: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.22 },
            y: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
          }}
          onTap={() => {
            if (committingDir === 0 && !revealed) setRevealed(true);
          }}
          role="group"
          aria-label={`${top.hanzi}. ${
            revealed
              ? `${top.pinyin}, ${meaningRu(top) || top.meaningPrimary}.`
              : "Иероглиф. Нажмите чтобы раскрыть. Свайп вправо — помню, влево — позже."
          }`}
        >
          {/* Surface tints painted ON the card itself — overlay the card
              face so even on devices that flatten the outer bloom there's
              still a visible jade/terracotta wash. */}
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              opacity: rightGlow,
              background:
                "radial-gradient(120% 80% at 100% 50%, rgba(127, 179, 140, 0.32), rgba(127, 179, 140, 0.08) 55%, transparent 80%)",
              zIndex: 3,
            }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              opacity: leftGlow,
              background:
                "radial-gradient(120% 80% at 0% 50%, rgba(217, 114, 102, 0.28), rgba(217, 114, 102, 0.07) 55%, transparent 80%)",
              zIndex: 3,
            }}
          />
          <CardFace char={top} revealed={revealed} />
        </motion.div>
      </div>

      {/* Gesture hints — small, low contrast, sitting under the card.
          Opacity tracks drag so the user gets immediate feedback. */}
      <div className="flex items-center justify-between px-6 -mt-7 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-soft)] select-none">
        <motion.span style={{ opacity: hintLeft }} className="inline-flex items-center gap-1">
          <span aria-hidden>←</span> позже
        </motion.span>
        <motion.span style={{ opacity: hintRight }} className="inline-flex items-center gap-1">
          знаю <span aria-hidden>→</span>
        </motion.span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Card face
   ────────────────────────────────────────────────────────────────────── */

function CardFace({
  char,
  revealed,
  dim,
  tabIndex,
}: {
  char: CharRecord;
  revealed: boolean;
  dim?: boolean;
  tabIndex?: number;
}) {
  return (
    <div
      tabIndex={tabIndex}
      className={`relative h-full w-full rounded-2xl border border-[var(--border)] bg-white shadow-sm overflow-hidden ${
        dim ? "scale-[0.96] opacity-70" : ""
      }`}
      style={dim ? { transformOrigin: "center top" } : undefined}
    >
      {/* Hanzi — absolute-centered in the full card surface so the
          reveal panel (overlay below) doesn't push it visually off-
          centre when collapsed. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="hanzi text-[140px] sm:text-[160px] leading-none select-none text-[var(--ink)]">
          {char.hanzi}
        </span>
      </div>

      {/* Reveal layer — pinyin + meaning. Absolute-positioned at the
          bottom so it never shifts the hanzi above. Fades + un-blurs
          on tap. */}
      <div
        className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-3 transition-[opacity,filter] duration-200 bg-white/85 backdrop-blur-sm border-t border-[var(--border)]"
        style={{
          opacity: revealed ? 1 : 0,
          filter: revealed ? "blur(0)" : "blur(6px)",
          pointerEvents: revealed ? "auto" : "none",
        }}
        aria-hidden={!revealed}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="pinyin text-lg text-[var(--foreground)]">
            {char.pinyin}
          </span>
          <button
            type="button"
            onClick={(e) => {
              // Don't bubble up to the card tap handler (we already
              // revealed by tap; the speak button is a follow-up action).
              e.stopPropagation();
              speakChinese(char.hanzi);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="btn btn-ghost h-8 w-8 p-0 rounded-full"
            aria-label="Произнести"
          >
            <Volume2 size={14} className="text-[var(--foreground-soft)]" />
          </button>
        </div>
        <p className="text-sm text-[var(--foreground-soft)] mt-1">
          {meaningRu(char) || char.meaningPrimary}
        </p>
      </div>

      {/* Quiet hint when unrevealed. Also absolute-positioned at the
          bottom so it doesn't shift the hanzi. */}
      {!revealed && !dim && (
        <div className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-3">
          <p className="text-xs text-center text-[var(--foreground-soft)] tracking-wide select-none">
            нажмите чтобы раскрыть
          </p>
        </div>
      )}
    </div>
  );
}

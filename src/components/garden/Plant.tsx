/**
 * Plant SVG visualization for the Garden.
 *
 * Each MemoryState maps to a growth stage:
 *   seen      → seed       (just sprouted, one tiny leaf)
 *   learning  → sprout     (two leaves, short stem)
 *   young     → stem       (taller stem, several leaves, single bud)
 *   mature    → bush       (rounded canopy with small flowers)
 *   rooted    → tree       (trunk + full crown, bonsai-like)
 *
 * Drawing style mirrors the §2 calm palette — sage / jade greens on a
 * loamy brown stem, no harsh outlines, no animation. Each plant fits
 * inside a square viewBox so it tiles cleanly.
 */
import type { MemoryState } from "@/lib/memoryState";

type Props = {
  state: MemoryState;
  size?: number;
  className?: string;
};

// Tone palette — matched to globals.css.
const SOIL = "#a78766";
const SOIL_SHADOW = "#7d6450";
const STEM = "#5a8a4f";
const STEM_DARK = "#3a5340";
const LEAF_LIGHT = "#86b07a";
const LEAF = "#5a8a4f";
const LEAF_DARK = "#3a6b48";
const BLOSSOM = "#e8b4b8";
const BLOSSOM_CORE = "#c97a82";
const TRUNK = "#7a5a3a";
const TRUNK_DARK = "#54401e";

export function Plant({ state, size = 72, className }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      {/* Soil mound — same for every stage so plants visually rest on
          the same baseline when tiled. */}
      <ellipse cx="50" cy="86" rx="34" ry="6" fill={SOIL} />
      <ellipse cx="50" cy="89" rx="30" ry="3" fill={SOIL_SHADOW} opacity="0.6" />
      {renderStage(state)}
    </svg>
  );
}

function renderStage(state: MemoryState) {
  switch (state) {
    case "seen":
      return (
        <g>
          {/* Tiny seed cap just emerged from soil with one curled leaf. */}
          <path
            d="M50 82 C 50 78 49 75 47 73 C 45 71 44 70 44 68"
            stroke={STEM}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M44 68 Q 38 64 42 60 Q 48 62 46 68 Z"
            fill={LEAF_LIGHT}
          />
        </g>
      );

    case "learning":
      return (
        <g>
          {/* Short sprout, two opposite leaves. */}
          <path
            d="M50 84 L 50 60"
            stroke={STEM}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M50 70 Q 36 66 32 56 Q 44 56 50 66 Z"
            fill={LEAF_LIGHT}
          />
          <path
            d="M50 66 Q 64 62 68 52 Q 56 52 50 62 Z"
            fill={LEAF}
          />
        </g>
      );

    case "young":
      return (
        <g>
          {/* Taller stem with three leaves and a closed bud at the tip. */}
          <path
            d="M50 84 C 49 70 52 60 50 46"
            stroke={STEM}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M49 70 Q 32 66 28 54 Q 42 54 50 66 Z"
            fill={LEAF_LIGHT}
          />
          <path
            d="M51 60 Q 70 56 74 44 Q 58 44 50 56 Z"
            fill={LEAF}
          />
          <path
            d="M50 52 Q 36 48 32 38 Q 46 38 51 48 Z"
            fill={LEAF_LIGHT}
          />
          <circle cx="50" cy="42" r="4.5" fill={LEAF_DARK} />
          <ellipse cx="50" cy="40" rx="3" ry="4" fill={BLOSSOM} />
        </g>
      );

    case "mature":
      return (
        <g>
          {/* Fuller bush — short stem with a rounded canopy and two
              open blossoms. */}
          <path
            d="M50 84 L 50 64"
            stroke={STEM_DARK}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="40" cy="56" r="14" fill={LEAF_LIGHT} />
          <circle cx="60" cy="56" r="14" fill={LEAF} />
          <circle cx="50" cy="44" r="14" fill={LEAF_LIGHT} />
          <circle cx="42" cy="60" r="10" fill={LEAF_DARK} opacity="0.5" />
          <circle cx="58" cy="60" r="10" fill={LEAF_DARK} opacity="0.5" />
          {/* Blossoms */}
          <Blossom cx={36} cy={48} />
          <Blossom cx={60} cy={42} />
          <Blossom cx={56} cy={58} />
        </g>
      );

    case "rooted":
      return (
        <g>
          {/* Trunk — short but textured. */}
          <path
            d="M44 84 C 44 76 46 70 47 60 L 53 60 C 54 70 56 76 56 84 Z"
            fill={TRUNK}
          />
          <path
            d="M44 84 C 44 76 46 70 47 60"
            stroke={TRUNK_DARK}
            strokeWidth="1.2"
            fill="none"
          />
          {/* Bonsai canopy — three overlapping cloud shapes. */}
          <ellipse cx="34" cy="50" rx="14" ry="11" fill={LEAF} />
          <ellipse cx="66" cy="50" rx="14" ry="11" fill={LEAF_DARK} />
          <ellipse cx="50" cy="38" rx="22" ry="14" fill={LEAF} />
          <ellipse cx="50" cy="32" rx="16" ry="10" fill={LEAF_LIGHT} />
          {/* Quiet seasonal accent: one tiny blossom. */}
          <Blossom cx={62} cy={36} small />
        </g>
      );
  }
}

function Blossom({ cx, cy, small }: { cx: number; cy: number; small?: boolean }) {
  const r = small ? 1.6 : 2.2;
  const petal = small ? 2.8 : 3.6;
  // Four petals + center.
  return (
    <g>
      <circle cx={cx} cy={cy - petal} r={r} fill={BLOSSOM} />
      <circle cx={cx + petal} cy={cy} r={r} fill={BLOSSOM} />
      <circle cx={cx} cy={cy + petal} r={r} fill={BLOSSOM} />
      <circle cx={cx - petal} cy={cy} r={r} fill={BLOSSOM} />
      <circle cx={cx} cy={cy} r={r} fill={BLOSSOM_CORE} />
    </g>
  );
}

/** Stage helper so callers can derive a stage name without re-importing. */
export function stageForState(state: MemoryState): string {
  return {
    seen: "Семечко",
    learning: "Росток",
    young: "Побег",
    mature: "Куст",
    rooted: "Дерево",
  }[state];
}

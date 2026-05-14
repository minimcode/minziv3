export function StreakPill({ count }: { count: number }) {
  return (
    <span className="streak-pill">
      <span className="text-base leading-none" role="img" aria-label="fire">🔥</span>
      {count}
    </span>
  );
}

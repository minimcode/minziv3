import Image from "next/image";

// Brand mark — rendered as a pre-baked raster (`/icon-192.png`) so the
// `字` glyph displays consistently even when the user's system lacks a
// CJK font.

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 overflow-hidden rounded-[9px] shadow-[0_2px_6px_-2px_rgba(196,58,58,0.5)]"
    >
      <Image
        src="/icon-192.png"
        alt=""
        width={size * 2}
        height={size * 2}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

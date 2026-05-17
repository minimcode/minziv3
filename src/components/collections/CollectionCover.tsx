"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { coverLabel, getCollectionCover } from "./collectionCovers";

function readIsDarkTheme(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.documentElement.classList.contains("theme-dark");
}

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  coverId: string;
  collectionName?: string;
}

export function CollectionCover({
  coverId,
  collectionName,
  className,
  alt = "",
  ...rest
}: Props) {
  const [isDarkTheme, setIsDarkTheme] = useState(readIsDarkTheme);

  useEffect(() => {
    // SSR-safe sync: re-read on mount in case the SSR pass returned a
    // stale value, then subscribe to <html> class mutations so the
    // selected variant follows light/dark theme switches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDarkTheme(readIsDarkTheme());
    const observer = new MutationObserver(() => {
      setIsDarkTheme(readIsDarkTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const cover = getCollectionCover(coverId, collectionName);

  return (
    <img
      src={isDarkTheme ? cover.dark : cover.light}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={cn("block h-full w-full object-cover", className)}
      draggable={false}
      {...rest}
    />
  );
}

export { coverLabel };

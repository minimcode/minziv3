import Image from "next/image";
import { cn } from "@/lib/cn";

export type PandaMood =
  | "hello"
  | "learning"
  | "studying"
  | "traveling"
  | "resting"
  | "practicing"
  | "success"
  | "tryagain"
  | "seeyou";

const SRC: Record<PandaMood, string> = {
  hello: "/panda/panda_hello.png",
  learning: "/panda/panda_learning.png",
  studying: "/panda/panda_studying.png",
  traveling: "/panda/panda_traveling.png",
  resting: "/panda/panda_resting.png",
  practicing: "/panda/panda_practicing.png",
  success: "/panda/panda_success.png",
  tryagain: "/panda/panda_tryagain.png",
  seeyou: "/panda/panda_seeyou.png",
};

export function Panda({
  mood = "hello",
  size = 120,
  className,
  alt,
  priority,
}: {
  mood?: PandaMood;
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={SRC[mood]}
      alt={alt ?? `panda-${mood}`}
      width={size}
      height={size}
      priority={priority}
      className={cn("select-none pointer-events-none", className)}
    />
  );
}

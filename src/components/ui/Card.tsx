import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...rest} />;
}

export function CardSoft({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-soft", className)} {...rest} />;
}

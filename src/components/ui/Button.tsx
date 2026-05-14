"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "success";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizeMap: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-[10px]",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-14 px-7 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = "primary", size = "md", ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "btn",
          variant === "primary" && "btn-primary",
          variant === "secondary" && "btn-secondary",
          variant === "ghost" && "btn-ghost",
          variant === "success" && "btn-success",
          sizeMap[size],
          className
        )}
        {...rest}
      />
    );
  }
);

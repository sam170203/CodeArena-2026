"use client";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "font-display font-extrabold tracking-[0.2em] text-white bg-gradient-to-br from-[var(--color-neon-pink)] to-[var(--color-neon-violet)] glow-pink hover:brightness-110 active:translate-y-[1px]",
  secondary:
    "font-mono font-bold tracking-[0.15em] text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/10",
  ghost:
    "font-mono font-bold tracking-[0.15em] text-[var(--color-text-2)] border border-[var(--color-border)] hover:border-[var(--color-border-hot)] hover:text-[var(--color-text-1)]",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2.5 text-xs rounded",
  lg: "px-8 py-4 text-sm rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center uppercase transition disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    />
  );
});

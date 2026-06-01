import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6",
          className
        )}
        {...rest}
      />
    );
  }
);

import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Props extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "span" | "div";
  tone?: "pink" | "cyan" | "violet" | "gold";
}

export function NeonText({
  as: Tag = "span",
  tone = "pink",
  className,
  children,
  style,
  ...rest
}: Props) {
  const grad =
    tone === "pink"
      ? "linear-gradient(180deg,#fff,#ec4899 75%)"
      : tone === "cyan"
      ? "linear-gradient(180deg,#fff,#22d3ee 75%)"
      : tone === "violet"
      ? "linear-gradient(180deg,#fff,#a855f7 75%)"
      : "linear-gradient(180deg,#fff,#fbbf24 75%)";
  return (
    <Tag
      className={cn("font-display font-black", className)}
      style={{
        backgroundImage: grad,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

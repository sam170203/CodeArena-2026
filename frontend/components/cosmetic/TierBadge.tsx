import { cn } from "@/lib/cn";
import { tierForElo, divisionForElo, TierKey } from "@/lib/tier";

type Size = "xs" | "sm" | "md" | "lg";

interface Props {
  elo: number;
  size?: Size;
  glow?: boolean;
  className?: string;
  showDivision?: boolean;
}

const TIER_GRADIENT: Record<TierKey, string> = {
  BRONZE:   "linear-gradient(135deg,#92400e,#b45309)",
  SILVER:   "linear-gradient(135deg,#475569,#94a3b8)",
  GOLD:     "linear-gradient(135deg,#b45309,#fbbf24)",
  PLATINUM: "linear-gradient(135deg,#0e7490,#67e8f9)",
  DIAMOND:  "linear-gradient(135deg,#6d28d9,#a78bfa)",
  MASTER:   "linear-gradient(135deg,#9d174d,#ec4899)",
  LEGEND:   "conic-gradient(from 0deg,#ec4899,#a855f7,#22d3ee,#fbbf24,#ec4899)",
};

const TIER_GLOW: Record<TierKey, string> = {
  BRONZE:   "0 0 14px rgba(180,83,9,0.4)",
  SILVER:   "0 0 14px rgba(148,163,184,0.4)",
  GOLD:     "0 0 16px rgba(251,191,36,0.5)",
  PLATINUM: "0 0 18px rgba(103,232,249,0.5)",
  DIAMOND:  "0 0 20px rgba(167,139,250,0.6)",
  MASTER:   "0 0 22px rgba(236,72,153,0.6)",
  LEGEND:   "0 0 26px rgba(236,72,153,0.7)",
};

const TIER_FG: Record<TierKey, string> = {
  BRONZE: "#fde68a",
  SILVER: "#f1f5f9",
  GOLD: "#fef3c7",
  PLATINUM: "#ecfeff",
  DIAMOND: "#ede9fe",
  MASTER: "#fce7f3",
  LEGEND: "#0a0a0a",
};

const SIZES: Record<Size, { box: string; font: string; sub: string }> = {
  xs: { box: "h-6 w-6 rounded-md",  font: "text-[10px]", sub: "text-[7px]" },
  sm: { box: "h-9 w-9 rounded-lg",  font: "text-[14px]", sub: "text-[8px]" },
  md: { box: "h-12 w-12 rounded-xl", font: "text-[18px]", sub: "text-[9px]" },
  lg: { box: "h-20 w-20 rounded-2xl", font: "text-[30px]", sub: "text-[11px]" },
};

function tierGlyph(key: TierKey, div: "I" | "II" | "III" | null): string {
  if (key === "LEGEND") return "L";
  if (key === "MASTER") return "M";
  if (key === "DIAMOND") return "◆";
  if (key === "PLATINUM") return "★";
  return div ?? "—";
}

export function TierBadge({
  elo,
  size = "md",
  glow = true,
  showDivision = true,
  className,
}: Props) {
  const tier = tierForElo(elo);
  const div = divisionForElo(elo);
  const dims = SIZES[size];
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center font-display font-extrabold",
        dims.box,
        dims.font,
        className
      )}
      style={{
        background: TIER_GRADIENT[tier.key],
        color: TIER_FG[tier.key],
        boxShadow: glow ? TIER_GLOW[tier.key] : undefined,
      }}
      aria-label={`${tier.key}${div ? ` ${div}` : ""}`}
    >
      <span>{tierGlyph(tier.key, div)}</span>
      {showDivision && size !== "xs" && tier.key !== "LEGEND" && div && (
        <span
          className={cn(
            "absolute right-1 bottom-0.5 font-mono opacity-80",
            dims.sub
          )}
        >
          {div}
        </span>
      )}
    </div>
  );
}

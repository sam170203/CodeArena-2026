"use client";
import Link from "next/link";
import { useAuth } from "@/stores/auth";
import { TierBadge } from "@/components/cosmetic/TierBadge";

export function UserPill() {
  const user = useAuth((s) => s.user);
  if (!user) return null;
  const elo = user.elo ?? 1200;
  return (
    <Link
      href="/profile"
      className="flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-1.5 pr-3 hover:border-[var(--color-border-hot)]"
    >
      <TierBadge elo={elo} size="xs" showDivision={false} />
      <span className="font-semibold text-[13px] text-[var(--color-text-1)]">
        {user.username}
      </span>
      <span className="font-mono text-[11px] text-[var(--color-neon-cyan)] tracking-[0.1em]">
        ELO {elo}
      </span>
    </Link>
  );
}

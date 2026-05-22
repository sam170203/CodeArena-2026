"use client";
import { useAuth } from "@/stores/auth";
import { Card } from "@/components/primitives/Card";
import { StatTile } from "@/components/primitives/StatTile";
import { TierBadge } from "@/components/cosmetic/TierBadge";
import { tierForElo, divisionForElo } from "@/lib/tier";
import { StreakBadge } from "./StreakBadge";

export function ProfileMicroCard() {
  const user = useAuth((s) => s.user);
  if (!user) return null;
  const elo = user.elo ?? 1200;
  const tier = tierForElo(elo);
  const div = divisionForElo(elo);
  const wins = user.duel_wins ?? 0;
  const losses = user.duel_losses ?? 0;
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <TierBadge elo={elo} size="md" />
        <div>
          <div className="font-semibold text-lg text-[var(--color-text-1)]">
            {user.username}
          </div>
          <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-neon-cyan)]">
            {tier.key}
            {div ? ` ${div}` : ""}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="ELO" value={elo} />
        <StatTile
          label="W / L"
          value={`${wins}·${losses}`}
          delta={`${winRate}% wins`}
          deltaTone="neutral"
        />
      </div>
      <StreakBadge />
    </Card>
  );
}

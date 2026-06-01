"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import { StatTile } from "@/components/primitives/StatTile";
import { NeonText } from "@/components/primitives/NeonText";
import { TierBadge } from "@/components/cosmetic/TierBadge";
import { Button } from "@/components/primitives/Button";

interface EloRow {
  elo_after: number;
  delta: number;
  result: string;
  created_at: string | null;
}

interface PublicProfile {
  user_id: string;
  username: string;
  cf_handle: string | null;
  elo: number;
  tier: string;
  duel_wins: number;
  duel_losses: number;
  xp: number;
  level: number;
  streak: {
    current_count: number;
    longest_count: number;
    shields_remaining: number;
  };
  elo_history: EloRow[];
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-profile", handle],
    queryFn: async () =>
      (await api.get<PublicProfile>(`/profile/by-handle/${handle}`)).data,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-xs tracking-[0.3em] text-[var(--color-text-3)]">
        // LOADING PROFILE…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <NeonText as="h1" className="text-4xl mb-4">
          Challenger not found.
        </NeonText>
        <p className="text-[var(--color-text-3)] mb-6">
          No one with the handle <span className="font-mono text-[var(--color-neon-cyan)]">@{handle}</span> in this arena.
        </p>
        <Link href="/leaderboard">
          <Button variant="ghost">Browse leaderboard</Button>
        </Link>
      </main>
    );
  }

  const points = data.elo_history.map((r) => r.elo_after);
  const min = points.length ? Math.min(...points) : data.elo;
  const max = points.length ? Math.max(...points) : data.elo;
  const span = Math.max(1, max - min);
  const W = 600;
  const H = 120;
  const pad = 12;
  const coords = points
    .map((p, i) => {
      const x = pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
      const y = H - pad - ((p - min) / span) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div className="mb-2 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)] uppercase">
        // public profile
      </div>

      <header className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <TierBadge elo={data.elo} size="lg" />
          <div>
            <NeonText as="h1" className="text-5xl tracking-[-1.5px] leading-none">
              {data.username}
            </NeonText>
            <div className="mt-2 font-mono text-[12px] tracking-[0.2em] text-[var(--color-neon-cyan)]">
              {data.tier} · ELO {data.elo}
            </div>
            {data.cf_handle && (
              <a
                href={`https://codeforces.com/profile/${data.cf_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block font-mono text-[11px] text-[var(--color-text-3)] hover:text-[var(--color-text-1)]"
              >
                @{data.cf_handle} ↗
              </a>
            )}
          </div>
        </div>
        <Link href="/play">
          <Button>Enter arena</Button>
        </Link>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="ELO" value={data.elo} />
        <StatTile
          label="W / L"
          value={`${data.duel_wins}·${data.duel_losses}`}
          delta={
            data.duel_wins + data.duel_losses > 0
              ? `${Math.round((data.duel_wins / (data.duel_wins + data.duel_losses)) * 100)}% wins`
              : "—"
          }
        />
        <StatTile
          label="Streak"
          value={data.streak.current_count}
          delta={`best ${data.streak.longest_count}`}
        />
        <StatTile label="XP" value={data.xp} delta={`lvl ${data.level}`} />
      </section>

      {points.length > 0 && (
        <Card>
          <div className="mb-3 font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
            ELO trajectory
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[120px]">
            <defs>
              <linearGradient id="pub-elo-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <polyline
              points={coords}
              fill="none"
              stroke="url(#pub-elo-grad)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p, i) => {
              const x = pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
              const y = H - pad - ((p - min) / span) * (H - pad * 2);
              const result = data.elo_history[i].result;
              const color =
                result === "win"
                  ? "#34d399"
                  : result === "loss"
                  ? "#ef4444"
                  : "#7a6fa3";
              return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
            })}
          </svg>
          <div className="mt-1 flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-3)]">
            <span>{points.length} duels</span>
            <span>
              {min} – {max}
            </span>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-3 font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
          Recent activity
        </div>
        {data.elo_history.length === 0 && (
          <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">
            No duels yet.
          </div>
        )}
        {[...data.elo_history]
          .reverse()
          .slice(0, 10)
          .map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[60px_1fr_80px_70px] items-center gap-3 border-b border-[var(--color-border)] py-2 last:border-b-0"
            >
              <div
                className={`font-display text-xs font-extrabold tracking-[0.15em] ${
                  row.result === "win"
                    ? "text-[var(--color-ok-green)]"
                    : row.result === "loss"
                    ? "text-[var(--color-fail-red)]"
                    : "text-[var(--color-text-3)]"
                }`}
              >
                {row.result.toUpperCase()}
              </div>
              <div className="font-mono text-[11px] text-[var(--color-text-3)]">
                ELO → {row.elo_after}
              </div>
              <div className="text-right font-mono text-[11px] text-[var(--color-text-3)]">
                {timeAgo(row.created_at)}
              </div>
              <div
                className={`text-right font-mono text-[13px] font-bold ${
                  row.delta > 0
                    ? "text-[var(--color-ok-green)]"
                    : row.delta < 0
                    ? "text-[var(--color-fail-red)]"
                    : "text-[var(--color-text-3)]"
                }`}
              >
                {row.delta > 0 ? "+" : ""}
                {row.delta}
              </div>
            </div>
          ))}
      </Card>
    </main>
  );
}

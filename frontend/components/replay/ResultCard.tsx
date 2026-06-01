"use client";
import { useState } from "react";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { TierBadge } from "@/components/cosmetic/TierBadge";
import type { ReplayResponse } from "@/types/replay";

function formatDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function eloChangeFromEvents(replay: ReplayResponse) {
  const last = [...replay.events]
    .reverse()
    .find((e) => e.event_type === "duel_complete");
  if (!last || last.event_type !== "duel_complete") return null;
  return last.payload.elo_changes;
}

export function ResultCard({ replay }: { replay: ReplayResponse }) {
  const [copied, setCopied] = useState(false);
  const host = replay.participants[0];
  const opp = replay.participants[1];

  const winnerName =
    replay.winner_id == null
      ? "DRAW"
      : replay.winner_id === host?.user_id
      ? host.username
      : opp?.username ?? "—";

  const eloChanges = eloChangeFromEvents(replay);

  const copyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <Card
      className="border-[var(--color-border-hot)] p-8"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 30% 0%, rgba(236,72,153,0.15), transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(168,85,247,0.15), transparent 55%)",
      }}
    >
      <div className="mb-2 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)] uppercase">
        // duel · {replay.duel_id.slice(0, 8)}
      </div>
      <div className="font-display text-5xl font-black tracking-[-1.5px] text-gradient-pink uppercase">
        {replay.winner_id == null ? "Stalemate" : `${winnerName} won.`}
      </div>

      <div className="mt-6 grid grid-cols-[1fr_60px_1fr] items-center gap-4">
        {host && (
          <PlayerSummary
            participant={host}
            eloDelta={eloChanges?.[host.user_id]?.delta ?? 0}
            align="left"
            isWinner={replay.winner_id === host.user_id}
          />
        )}
        <div className="text-center font-display text-2xl text-[var(--color-text-3)]">
          vs
        </div>
        {opp && (
          <PlayerSummary
            participant={opp}
            eloDelta={eloChanges?.[opp.user_id]?.delta ?? 0}
            align="right"
            isWinner={replay.winner_id === opp.user_id}
          />
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            Duration
          </div>
          <div className="font-mono text-xl text-[var(--color-text-1)] mt-0.5">
            {formatDur(replay.duration_seconds)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            Steps
          </div>
          <div className="font-mono text-xl text-[var(--color-text-1)] mt-0.5">
            {replay.steps.length}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            Events
          </div>
          <div className="font-mono text-xl text-[var(--color-text-1)] mt-0.5">
            {replay.events.length}
          </div>
        </div>
      </div>

      <div className="mt-7 flex gap-3 justify-center">
        <Button onClick={copyLink}>{copied ? "Link copied ✓" : "Share replay"}</Button>
        <a href="/play">
          <Button variant="ghost">Back to arena</Button>
        </a>
      </div>
    </Card>
  );
}

function PlayerSummary({
  participant,
  eloDelta,
  align,
  isWinner,
}: {
  participant: ReplayResponse["participants"][number];
  eloDelta: number;
  align: "left" | "right";
  isWinner: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <TierBadge elo={participant.elo} size="md" />
      <div>
        <div className="font-display text-lg font-bold text-[var(--color-text-1)]">
          {participant.username}
        </div>
        <div className="font-mono text-[11px] tracking-[0.15em] text-[var(--color-text-3)]">
          {participant.tier} · ELO {participant.elo}
        </div>
        <div
          className={`mt-0.5 font-mono text-sm font-bold ${
            eloDelta > 0
              ? "text-[var(--color-ok-green)]"
              : eloDelta < 0
              ? "text-[var(--color-fail-red)]"
              : "text-[var(--color-text-3)]"
          }`}
        >
          {eloDelta > 0 ? "+" : ""}
          {eloDelta} ELO
        </div>
        {isWinner && (
          <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-gold)] mt-0.5">
            VICTOR
          </div>
        )}
      </div>
    </div>
  );
}

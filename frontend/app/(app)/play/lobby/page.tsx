"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";
import { TierBadge } from "@/components/cosmetic/TierBadge";

interface OpenRoom {
  id: string;
  code: string;
  rating_preset: string;
  created_at: string | null;
  host: { user_id: string; username: string; elo: number; tier: string };
}

interface ActiveDuel {
  duel_id: string;
  format: string;
  rating_target: number;
  started_at: string | null;
  participants: { user_id: string; username: string; elo: number; tier: string }[];
}

function timeSince(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}

export default function OpenLobbyPage() {
  const rooms = useQuery({
    queryKey: ["open-rooms"],
    queryFn: async () => (await api.get<OpenRoom[]>("/lobby/open-rooms")).data,
    refetchInterval: 5000,
  });
  const duels = useQuery({
    queryKey: ["active-duels"],
    queryFn: async () => (await api.get<ActiveDuel[]>("/lobby/active-duels")).data,
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-1 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)]">
          // OPEN LOBBY
        </div>
        <NeonText as="h1" className="text-4xl tracking-[-1px]">
          The arena hall.
        </NeonText>
        <p className="mt-2 text-sm text-[var(--color-text-3)]">
          Open friend rooms waiting for an opponent · live duels you can spectate.
        </p>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">
            Open rooms
          </div>
          <span className="font-mono text-[11px] text-[var(--color-text-3)] tracking-[0.2em] uppercase">
            {rooms.data?.length ?? 0} waiting
          </span>
        </div>
        {rooms.isLoading && (
          <div className="font-mono text-xs text-[var(--color-text-3)]">loading…</div>
        )}
        {rooms.data && rooms.data.length === 0 && (
          <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">
            No open rooms. Be the first.{" "}
            <Link
              href="/play/friend"
              className="text-[var(--color-neon-cyan)] hover:underline"
            >
              Host one
            </Link>
            .
          </div>
        )}
        {rooms.data?.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[44px_1fr_140px_100px_100px] items-center gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0"
          >
            <TierBadge elo={r.host.elo} size="sm" showDivision={false} />
            <div>
              <div className="font-semibold text-[var(--color-text-1)]">
                {r.host.username}
              </div>
              <div className="font-mono text-[10px] tracking-[0.15em] text-[var(--color-text-3)] uppercase">
                {r.host.tier} · ELO {r.host.elo}
              </div>
            </div>
            <div className="font-mono text-[11px] tracking-[0.15em] text-[var(--color-text-3)] uppercase">
              preset · {r.rating_preset}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-3)] text-right">
              {timeSince(r.created_at)}
            </div>
            <Link
              href={`/play/friend?code=${r.code}`}
              className="font-display text-[11px] tracking-[0.2em] text-[var(--color-neon-cyan)] uppercase text-right hover:text-[var(--color-text-1)]"
            >
              JOIN →
            </Link>
          </div>
        ))}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">
            Live now
          </div>
          <span className="font-mono text-[11px] text-[var(--color-text-3)] tracking-[0.2em] uppercase">
            {duels.data?.length ?? 0} ongoing
          </span>
        </div>
        {duels.isLoading && (
          <div className="font-mono text-xs text-[var(--color-text-3)]">loading…</div>
        )}
        {duels.data && duels.data.length === 0 && (
          <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">
            No active duels right now.
          </div>
        )}
        {duels.data?.map((d) => (
          <div
            key={d.duel_id}
            className="grid grid-cols-[1fr_140px_120px] items-center gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {d.participants.map((p, i) => (
                <span key={p.user_id} className="flex items-center gap-1.5">
                  <TierBadge elo={p.elo} size="xs" showDivision={false} />
                  <span className="font-semibold text-sm text-[var(--color-text-1)]">
                    {p.username}
                  </span>
                  {i < d.participants.length - 1 && (
                    <span className="font-mono text-xs text-[var(--color-text-3)] mx-1">
                      vs
                    </span>
                  )}
                </span>
              ))}
            </div>
            <div className="font-mono text-[10px] tracking-[0.15em] text-[var(--color-text-3)] uppercase">
              {timeSince(d.started_at)}
            </div>
            <Link href={`/duel/${d.duel_id}/spectate`} className="text-right">
              <Button variant="secondary" size="md">
                Spectate
              </Button>
            </Link>
          </div>
        ))}
      </Card>
    </div>
  );
}

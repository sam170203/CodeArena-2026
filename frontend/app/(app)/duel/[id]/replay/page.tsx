"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import { NeonText } from "@/components/primitives/NeonText";
import { ReplayTimeline } from "@/components/replay/ReplayTimeline";
import { ResultCard } from "@/components/replay/ResultCard";
import type { ReplayResponse } from "@/types/replay";

export default function ReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["replay", id],
    queryFn: async () =>
      (await api.get<ReplayResponse>(`/replay/${id}`)).data,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-mono text-xs tracking-[0.3em] text-[var(--color-text-3)]">
        // LOADING REPLAY…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <NeonText as="h1" className="text-4xl mb-4">
          Replay not found.
        </NeonText>
        <p className="text-[var(--color-text-3)] mb-6">
          The duel may not have finished yet, or the link is invalid.
        </p>
        <Link
          href="/play"
          className="font-mono text-[12px] tracking-[0.2em] text-[var(--color-neon-cyan)] uppercase"
        >
          ← Back to arena
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <div className="mb-1 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)] uppercase">
          // replay
        </div>
        <NeonText as="h1" className="text-4xl tracking-[-1px]">
          The full tape.
        </NeonText>
      </div>

      <ResultCard replay={data} />

      <Card>
        <div className="mb-6 font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">
          Timeline
        </div>
        <ReplayTimeline replay={data} />
      </Card>

      <Card>
        <div className="mb-4 font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">
          Problems
        </div>
        <div className="space-y-2">
          {data.steps.map((s) => {
            const hostSolved = s.host_status === "solved";
            const oppSolved = s.opponent_status === "solved";
            return (
              <div
                key={s.step_index}
                className="grid grid-cols-[40px_1fr_80px_80px] items-center gap-3 border-b border-[var(--color-border)] py-2.5 last:border-b-0"
              >
                <div className="font-mono text-[11px] tracking-[0.15em] text-[var(--color-text-3)]">
                  #{s.step_index + 1}
                </div>
                <div>
                  <a
                    href={`https://codeforces.com/contest/${s.problem.contest_id}/problem/${s.problem.index}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[var(--color-text-1)] hover:text-[var(--color-neon-cyan)]"
                  >
                    {s.problem.contest_id}
                    {s.problem.index} — {s.problem.name}
                  </a>
                  <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-3)]">
                    {s.rating} · {(s.problem.tags ?? []).join(", ") || "—"}
                  </div>
                </div>
                <div
                  className={`text-right font-mono text-[11px] ${
                    hostSolved
                      ? "text-[var(--color-ok-green)]"
                      : "text-[var(--color-text-4)]"
                  }`}
                >
                  {data.participants[0]?.username?.slice(0, 8) ?? "host"}{" "}
                  {hostSolved ? "✓" : "·"}
                </div>
                <div
                  className={`text-right font-mono text-[11px] ${
                    oppSolved
                      ? "text-[var(--color-ok-green)]"
                      : "text-[var(--color-text-4)]"
                  }`}
                >
                  {data.participants[1]?.username?.slice(0, 8) ?? "opp"}{" "}
                  {oppSolved ? "✓" : "·"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

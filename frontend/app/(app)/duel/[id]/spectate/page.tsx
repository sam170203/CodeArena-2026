"use client";
import { use, useEffect } from "react";
import { useDuel } from "@/stores/duel";
import { OpponentPanel } from "@/components/arena/OpponentPanel";
import { ProblemCard } from "@/components/arena/ProblemCard";
import { ScanlineOverlay } from "@/components/primitives/ScanlineOverlay";
import { FloatingEmotes } from "@/components/arena/FloatingEmotes";
import { NeonText } from "@/components/primitives/NeonText";
import { DuelHeader } from "@/components/arena/DuelHeader";

export default function SpectatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { duel, load, connect, disconnect } = useDuel();

  useEffect(() => {
    load(id).catch(() => {});
    connect(id);
    return () => disconnect();
  }, [id, load, connect, disconnect]);

  if (!duel) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-mono text-xs tracking-[0.3em] text-[var(--color-text-3)]">
        // LOADING DUEL…
      </div>
    );
  }

  const host = duel.host;
  const opp = duel.opponent;

  const hostSteps = duel.steps.map((s) => ({
    step_index: s.step_index,
    status: s.host_status,
  }));
  const oppSteps = duel.steps.map((s) => ({
    step_index: s.step_index,
    status: s.opponent_status,
  }));

  const leadStepIdx = Math.max(
    host?.current_step ?? 0,
    opp?.current_step ?? 0
  );
  const leadStep = duel.steps[Math.min(leadStepIdx, duel.steps.length - 1)];
  const startedAt = duel.started_at ?? new Date().toISOString();

  return (
    <>
      <ScanlineOverlay />
      <div className="space-y-6">
        <DuelHeader
          duelId={id}
          opponentName={`${host?.username ?? "host"} vs ${opp?.username ?? "—"}`}
          startedAt={startedAt}
          capSeconds={duel.time_cap_seconds}
          duelStatus={duel.status}
          spectatorMode
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
          <OpponentPanel
            align="left"
            username={host?.username ?? "host"}
            elo={host?.elo ?? 1200}
            steps={hostSteps}
            current={host?.current_step ?? 0}
            lastVerdict={host?.last_verdict}
          />
          <OpponentPanel
            align="right"
            username={opp?.username ?? "—"}
            elo={opp?.elo ?? 1200}
            steps={oppSteps}
            current={opp?.current_step ?? 0}
            lastVerdict={opp?.last_verdict}
          />
        </div>

        {leadStep && (
          <ProblemCard
            rating={leadStep.rating}
            step={leadStep.step_index}
            total={duel.steps.length}
            contestId={leadStep.problem.contest_id}
            index={leadStep.problem.index}
            name={leadStep.problem.name}
            tags={leadStep.problem.tags ?? []}
          />
        )}

        {duel.status === "complete" && (
          <div className="text-center">
            <NeonText as="h2" className="text-3xl">
              Duel complete.
            </NeonText>
            <a
              href={`/duel/${id}/replay`}
              className="mt-3 inline-block font-mono text-[11px] tracking-[0.2em] text-[var(--color-neon-cyan)] uppercase hover:text-[var(--color-text-1)]"
            >
              View full replay →
            </a>
          </div>
        )}
      </div>

      <FloatingEmotes />
    </>
  );
}

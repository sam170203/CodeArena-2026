"use client";
import { use, useEffect } from "react";
import { useDuel } from "@/stores/duel";
import { useAuth } from "@/stores/auth";
import { OpponentPanel } from "@/components/arena/OpponentPanel";
import { ProblemCard } from "@/components/arena/ProblemCard";
import { DuelTimer } from "@/components/arena/DuelTimer";
import { ScanlineOverlay } from "@/components/primitives/ScanlineOverlay";
import { VictoryOverlay } from "@/components/arena/VictoryOverlay";

export default function DuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const me = useAuth((s) => s.user);
  const { duel, load, connect, disconnect, complete } = useDuel();

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

  const meIsHost = !!(me && duel.host?.user_id === me.id);
  const self = meIsHost ? duel.host : duel.opponent ?? duel.host;
  const opp = meIsHost ? duel.opponent : duel.host;

  const mySteps = duel.steps.map((s) => ({
    step_index: s.step_index,
    status: meIsHost ? s.host_status : s.opponent_status,
  }));
  const oppSteps = duel.steps.map((s) => ({
    step_index: s.step_index,
    status: meIsHost ? s.opponent_status : s.host_status,
  }));

  const currentStepIdx = Math.min(self?.current_step ?? 0, duel.steps.length - 1);
  const currentStep = duel.steps[currentStepIdx];
  const startedAt = duel.started_at ?? new Date().toISOString();

  const myEloChange = complete && me ? complete.eloChanges[me.id] : null;
  const result: "win" | "loss" | "draw" | null =
    complete && me
      ? complete.winnerId == null
        ? "draw"
        : complete.winnerId === me.id
        ? "win"
        : "loss"
      : null;

  return (
    <>
      <ScanlineOverlay />
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <a
            href="/play"
            className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)] hover:text-[var(--color-text-1)]"
          >
            ◀ EXIT
          </a>
          <DuelTimer startedAt={startedAt} capSeconds={duel.time_cap_seconds} />
          <span className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)]">
            EMOTES · soon
          </span>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <OpponentPanel
            align="left"
            username={self?.username ?? "you"}
            elo={self?.elo ?? 1200}
            steps={mySteps}
            current={self?.current_step ?? 0}
            lastVerdict={self?.last_verdict}
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

        {currentStep && (
          <ProblemCard
            rating={currentStep.rating}
            step={currentStep.step_index}
            total={duel.steps.length}
            contestId={currentStep.problem.contest_id}
            index={currentStep.problem.index}
            name={currentStep.problem.name}
            tags={currentStep.problem.tags ?? []}
            lastVerdict={self?.last_verdict}
          />
        )}
      </div>

      {result && myEloChange && (
        <VictoryOverlay
          result={result}
          myEloBefore={myEloChange.before}
          myEloAfter={myEloChange.after}
          myDelta={myEloChange.delta}
        />
      )}
    </>
  );
}

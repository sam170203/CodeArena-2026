"use client";
import { use, useEffect, useState } from "react";
import { useDuel } from "@/stores/duel";
import { useAuth } from "@/stores/auth";
import { OpponentPanel } from "@/components/arena/OpponentPanel";
import { ProblemCard } from "@/components/arena/ProblemCard";
import { ScanlineOverlay } from "@/components/primitives/ScanlineOverlay";
import { VictoryOverlay } from "@/components/arena/VictoryOverlay";
import { PromotionCeremony } from "@/components/arena/PromotionCeremony";
import { DemotionToast } from "@/components/arena/DemotionToast";
import { FloatingEmotes } from "@/components/arena/FloatingEmotes";
import { ActivityTicker } from "@/components/arena/ActivityTicker";
import { DuelHeader } from "@/components/arena/DuelHeader";

export default function DuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const me = useAuth((s) => s.user);
  const { duel, load, sync, connect, disconnect, complete, recentEvents } =
    useDuel();

  // ALL hooks must run unconditionally on every render.
  const [ceremonyDone, setCeremonyDone] = useState(false);

  useEffect(() => {
    (async () => {
      await load(id).catch(() => {});
      await sync(id).catch(() => {});
    })();
    connect(id);
    const tick = setInterval(() => {
      sync(id).catch(() => {});
    }, 5_000);
    return () => {
      clearInterval(tick);
      disconnect();
    };
  }, [id, load, sync, connect, disconnect]);

  // Conditional rendering — but never conditional hooks.
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

  const myStepIdx = Math.min(self?.current_step ?? 0, duel.steps.length - 1);
  const oppStepIdx = Math.min(opp?.current_step ?? 0, duel.steps.length - 1);
  const myCurrentStep = duel.steps[myStepIdx];
  const oppCurrentStep = duel.steps[oppStepIdx];
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

  const promotedMe = !!(complete && me && complete.promotionFor === me.id);
  const demotedMe = !!(complete && me && complete.demotionFor === me.id);

  const myCfInvalid = self && self.cf_valid === false;
  const myCfError = self?.cf_error;
  const syncHint =
    myCfInvalid && myCfError
      ? myCfError
      : !self?.cf_handle
      ? "Link your Codeforces handle in Settings to track solves."
      : duel.status === "active"
      ? "Submit on Codeforces after the duel starts — only new submissions count."
      : null;

  return (
    <>
      <ScanlineOverlay />
      <div className="space-y-6">
        <DuelHeader
          duelId={id}
          opponentName={opp?.username ?? "—"}
          startedAt={startedAt}
          capSeconds={duel.time_cap_seconds}
          duelStatus={duel.status}
        />

        {syncHint && (
          <div
            className={`rounded-lg border px-4 py-3 font-mono text-[11px] tracking-wide ${
              myCfInvalid
                ? "border-[var(--color-danger)]/50 bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                : "border-[var(--color-neon-cyan)]/30 bg-[var(--color-neon-cyan)]/5 text-[var(--color-neon-cyan)]"
            }`}
          >
            {myCfInvalid ? "⚠ CF sync blocked: " : "// "}
            {syncHint}
            {myCfInvalid && (
              <>
                {" "}
                <a
                  href="/profile/settings"
                  className="underline hover:opacity-80"
                >
                  Fix in Settings
                </a>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
          <OpponentPanel
            align="left"
            username={self?.username ?? "you"}
            elo={self?.elo ?? 1200}
            steps={mySteps}
            current={self?.current_step ?? 0}
            lastVerdict={self?.last_verdict}
            currentProblem={
              myCurrentStep
                ? {
                    name: myCurrentStep.problem.name,
                    rating: myCurrentStep.rating,
                  }
                : null
            }
            isYou
          />
          <OpponentPanel
            align="right"
            username={opp?.username ?? "—"}
            elo={opp?.elo ?? 1200}
            steps={oppSteps}
            current={opp?.current_step ?? 0}
            lastVerdict={opp?.last_verdict}
            currentProblem={
              oppCurrentStep
                ? {
                    name: oppCurrentStep.problem.name,
                    rating: oppCurrentStep.rating,
                  }
                : null
            }
          />
        </div>

        {myCurrentStep && (
          <ProblemCard
            rating={myCurrentStep.rating}
            step={myCurrentStep.step_index}
            total={duel.steps.length}
            contestId={myCurrentStep.problem.contest_id}
            index={myCurrentStep.problem.index}
            name={myCurrentStep.problem.name}
            tags={myCurrentStep.problem.tags ?? []}
            lastVerdict={self?.last_verdict}
          />
        )}

        <ActivityTicker events={recentEvents} />
      </div>

      <FloatingEmotes />
      <DemotionToast show={demotedMe} />

      {promotedMe && !ceremonyDone && complete?.newTier && myEloChange && (
        <PromotionCeremony
          newTier={complete.newTier}
          newElo={myEloChange.after}
          onDone={() => setCeremonyDone(true)}
        />
      )}

      {result && myEloChange && (!promotedMe || ceremonyDone) && (
        <VictoryOverlay
          result={result}
          myEloBefore={myEloChange.before}
          myEloAfter={myEloChange.after}
          myDelta={myEloChange.delta}
          duelId={id}
        />
      )}
    </>
  );
}

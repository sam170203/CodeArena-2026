"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import type { TodayQuests, QuestProgress } from "@/types/quest";
import { cn } from "@/lib/cn";

function progressPercent(q: QuestProgress): number {
  if (q.completed_at) return 100;
  if (q.rule.type === "wins") {
    const target = q.rule.target ?? 1;
    const cur = Number(q.progress.count ?? 0);
    return Math.min(100, Math.round((cur / target) * 100));
  }
  return 0;
}

function progressLabel(q: QuestProgress): string {
  if (q.completed_at) return q.claimed_at ? "Claimed" : "Ready";
  if (q.rule.type === "wins") {
    const target = q.rule.target ?? 1;
    const cur = Number(q.progress.count ?? 0);
    return `${cur} / ${target}`;
  }
  return "—";
}

function QuestRow({ q, onClaim }: { q: QuestProgress; onClaim: (id: string) => void }) {
  const pct = progressPercent(q);
  const ready = !!q.completed_at && !q.claimed_at;
  return (
    <div
      className={cn(
        "rounded-lg border p-3.5 transition",
        ready
          ? "border-[var(--color-neon-gold)]/40 bg-[var(--color-neon-gold)]/[0.06]"
          : "border-[var(--color-border)] bg-[var(--color-neon-violet)]/[0.05]"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-[13px] font-semibold text-[var(--color-text-1)]">
          {q.title}
        </div>
        <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-3)]">
          {progressLabel(q)}
        </div>
      </div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] tracking-[0.15em] text-[var(--color-neon-gold)]">
          +{q.xp_reward} XP
          {q.shield_reward > 0 ? ` · ${q.shield_reward} shield` : ""}
        </div>
        {ready && (
          <Button
            size="md"
            variant="secondary"
            onClick={() => onClaim(q.id)}
            className="!px-3 !py-1.5 !text-[10px]"
          >
            Claim
          </Button>
        )}
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--color-bg-haze)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-violet)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function QuestsPanel({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["quests-today"],
    queryFn: async () => (await api.get<TodayQuests>("/quests/today")).data,
  });

  const claim = useMutation({
    mutationFn: async (id: string) => (await api.post(`/quests/${id}/claim`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quests-today"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const daily = data?.daily ?? [];
  const completedCount = daily.filter((q) => q.completed_at).length;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">
          Today&apos;s quests
        </div>
        <span className="font-mono text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.2em]">
          {completedCount} / {daily.length}
        </span>
      </div>
      {isLoading && (
        <div className="font-mono text-xs text-[var(--color-text-3)]">loading…</div>
      )}
      {!isLoading && daily.length === 0 && (
        <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">
          No quests rolled. Refresh in a moment.
        </div>
      )}
      <div className="space-y-2.5">
        {daily.map((q) => (
          <QuestRow key={q.id} q={q} onClaim={(id) => claim.mutate(id)} />
        ))}
      </div>
      {!compact && data?.weekly?.[0] && (
        <>
          <div className="mt-5 mb-2 font-mono text-[10px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
            Weekly
          </div>
          <QuestRow q={data.weekly[0]} onClaim={(id) => claim.mutate(id)} />
        </>
      )}
    </Card>
  );
}

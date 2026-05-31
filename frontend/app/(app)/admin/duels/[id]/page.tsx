"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import type { AdminDuelDetail } from "@/types/admin";

export default function AdminDuelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [duel, setDuel] = useState<AdminDuelDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<AdminDuelDetail>(`/admin/duels/${id}`)
      .then((r) => setDuel(r.data))
      .catch((e) => setError(e?.response?.data?.detail ?? "Failed to load"));
  }, [id]);

  if (error) {
    return (
      <div className="font-mono text-xs text-[var(--color-fail-red)]">
        // {error}
      </div>
    );
  }

  if (!duel) {
    return (
      <div className="font-mono text-xs tracking-[0.3em] text-[var(--color-text-3)]">
        // LOADING…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-lg font-black tracking-[0.15em] text-white uppercase">
          Duel {duel.id.slice(0, 8)}
        </h1>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)] mt-1">
          {duel.status} &middot; {duel.format} &middot; {duel.problem_name ?? "No problem"}
        </p>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="text-center p-4 space-y-1">
          <div className="font-display text-xl font-black text-white capitalize">{duel.status}</div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">Status</div>
        </Card>
        <Card className="text-center p-4 space-y-1">
          <div className="font-display text-xl font-black text-white">{duel.participant_count}</div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">Players</div>
        </Card>
        <Card className="text-center p-4 space-y-1">
          <div className="font-display text-xl font-black text-white">{duel.time_cap_seconds}s</div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">Time Cap</div>
        </Card>
        <Card className="text-center p-4 space-y-1">
          <div className="font-display text-xl font-black text-white">
            {duel.started_at ? new Date(duel.started_at).toLocaleDateString() : "—"}
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">Started</div>
        </Card>
      </div>

      {/* Participants */}
      <section className="space-y-3">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
          Participants
        </h2>
        <div className="space-y-1">
          {duel.participants.map((p) => (
            <Link
              key={p.user_id}
              href={`/admin/users/${p.user_id}`}
              className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-2 transition hover:border-[var(--color-border-hot)]"
            >
              <span className="font-mono text-xs text-[var(--color-text-2)] flex-1">{p.user_id.slice(0, 12)}…</span>
              <span className="font-mono text-xs text-[var(--color-text-4)]">rating: {p.current_rating}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="space-y-3">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
          Steps
        </h2>
        <div className="space-y-1">
          {duel.steps.map((s) => (
            <div key={s.step_index} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-2">
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-[var(--color-text-4)]">#{s.step_index}</span>
                <span className="font-mono text-xs text-[var(--color-text-2)] flex-1">{s.problem_name}</span>
                <span className="font-mono text-[11px] text-[var(--color-neon-gold)]">{s.rating}</span>
                <span className="font-mono text-[10px] uppercase text-[var(--color-ok-green)]">{s.host_status}</span>
                <span className="font-mono text-[10px] uppercase text-[var(--color-neon-cyan)]">{s.opponent_status}</span>
              </div>
              {s.problem_tags.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {s.problem_tags.map((t) => (
                    <span key={t} className="font-mono text-[9px] text-[var(--color-text-4)] border border-[var(--color-border)] rounded px-1.5 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ELO Changes */}
      {duel.elo_changes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
            ELO Changes
          </h2>
          <div className="space-y-1">
            {duel.elo_changes.map((e, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-2 font-mono text-xs">
                <Link href={`/admin/users/${e.user_id}`} className="text-[var(--color-neon-cyan)] hover:underline">{e.user_id.slice(0, 12)}…</Link>
                <span className={e.delta > 0 ? "text-[var(--color-ok-green)]" : e.delta < 0 ? "text-[var(--color-fail-red)]" : "text-[var(--color-text-3)]"}>
                  {e.delta > 0 ? "+" : ""}{e.delta}
                </span>
                <span className="text-[var(--color-text-2)]">{e.elo_before} → {e.elo_after}</span>
                <span className="text-[var(--color-text-4)] uppercase">{e.result}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Submissions */}
      {duel.submissions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
            Submissions
          </h2>
          <div className="space-y-1">
            {duel.submissions.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-2 font-mono text-xs">
                <Link href={`/admin/users/${s.user_id}`} className="text-[var(--color-neon-cyan)] hover:underline">{s.user_id.slice(0, 12)}…</Link>
                <span className="text-[var(--color-text-2)] truncate flex-1">{s.problem_id}</span>
                <span className="text-[var(--color-text-4)]">{s.language}</span>
                <span className={s.status === "accepted" ? "text-[var(--color-ok-green)]" : "text-[var(--color-text-3)]"}>{s.status}</span>
                {s.runtime_ms && <span className="text-[var(--color-text-4)]">{s.runtime_ms}ms</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

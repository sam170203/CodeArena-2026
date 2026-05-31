"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import type { AdminUserDetail } from "@/types/admin";
import { useAuth } from "@/stores/auth";

const ROLE_COLORS: Record<string, string> = {
  user: "text-[var(--color-text-4)]",
  moderator: "text-[var(--color-neon-cyan)]",
  admin: "text-[var(--color-neon-pink)]",
  superadmin: "text-[var(--color-neon-gold)]",
};

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const me = useAuth((s) => s.user);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchUser = () => {
    api.get<AdminUserDetail>(`/admin/users/${id}`)
      .then((r) => setUser(r.data))
      .catch((e) => setError(e?.response?.data?.detail ?? "Failed to load"));
  };

  useEffect(() => { fetchUser(); }, [id]);

  const changeRole = async (role: string) => {
    setBusy(true);
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      fetchUser();
    } catch { /* ignore */ }
    setBusy(false);
  };

  const toggleSuspend = async (suspended: boolean) => {
    setBusy(true);
    try {
      await api.patch(`/admin/users/${id}/suspend`, { suspended });
      fetchUser();
    } catch { /* ignore */ }
    setBusy(false);
  };

  if (error) {
    return (
      <div className="font-mono text-xs text-[var(--color-fail-red)]">
        // {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="font-mono text-xs tracking-[0.3em] text-[var(--color-text-3)]">
        // LOADING…
      </div>
    );
  }

  const isSuperadmin = me?.role === "superadmin";
  const isAdmin = me?.role === "admin" || isSuperadmin;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-lg font-black tracking-[0.15em] text-white uppercase">
            {user.username}
          </h1>
          <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)] mt-1">
            {user.email ?? "—"} &middot; {user.cf_handle ?? "no CF handle"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs uppercase ${ROLE_COLORS[user.role] ?? ""}`}>
            {user.role}
          </span>
          {user.is_suspended && (
            <span className="font-mono text-[10px] text-[var(--color-fail-red)] uppercase border border-[var(--color-fail-red)] rounded px-2 py-0.5">
              SUSPENDED
            </span>
          )}
        </div>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <Card className="space-y-3">
          <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-text-4)] uppercase">
            Admin Actions
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[var(--color-text-2)]">Role:</span>
              {["user", "moderator", "admin"].map((r) => (
                <Button
                  key={r}
                  variant="ghost"
                  size="md"
                  disabled={busy || (r === "admin" && !isSuperadmin) || user.role === r}
                  onClick={() => changeRole(r)}
                  className="text-[10px]!"
                >
                  {r}
                </Button>
              ))}
              {isSuperadmin && (
                <Button
                  variant="ghost"
                  size="md"
                  disabled={busy || user.role === "superadmin"}
                  onClick={() => changeRole("superadmin")}
                  className="text-[10px]!"
                >
                  superadmin
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="md"
              disabled={busy || (me?.role === "moderator" && (user.role === "admin" || user.role === "superadmin"))}
              onClick={() => toggleSuspend(!user.is_suspended)}
              className="text-[10px]! text-[var(--color-fail-red)]"
            >
              {user.is_suspended ? "Unsuspend" : "Suspend"}
            </Button>
          </div>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="text-center p-4 space-y-1">
          <div className="font-display text-xl font-black text-white">{user.elo}</div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">ELO</div>
        </Card>
        <Card className="text-center p-4 space-y-1">
          <div className="font-display text-xl font-black text-white">{user.duel_wins}W / {user.duel_losses}L</div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">Duels</div>
        </Card>
        <Card className="text-center p-4 space-y-1">
          <div className="font-display text-xl font-black text-white">{user.xp}</div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">XP</div>
        </Card>
        <Card className="text-center p-4 space-y-1">
          <div className="font-display text-xl font-black text-white">{user.streak.current_count}</div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">Streak</div>
        </Card>
      </div>

      {/* ELO History */}
      <section className="space-y-3">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
          ELO History (last 100)
        </h2>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {user.elo_history.map((h, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-2 font-mono text-xs">
              <span className={h.delta > 0 ? "text-[var(--color-ok-green)]" : h.delta < 0 ? "text-[var(--color-fail-red)]" : "text-[var(--color-text-3)]"}>
                {h.delta > 0 ? "+" : ""}{h.delta}
              </span>
              <span className="text-[var(--color-text-2)]">{h.elo_before} → {h.elo_after}</span>
              <span className="text-[var(--color-text-4)] uppercase">{h.result}</span>
              <span className="text-[var(--color-text-4)] ml-auto">{h.created_at ? new Date(h.created_at).toLocaleDateString() : "—"}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Duels */}
      <section className="space-y-3">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
          Recent Duels
        </h2>
        <div className="space-y-1">
          {user.recent_duels.map((d) => (
            <Link
              key={d.id}
              href={`/admin/duels/${d.id}`}
              className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-2 transition hover:border-[var(--color-border-hot)]"
            >
              <span className={`font-mono text-xs ${d.result === "win" ? "text-[var(--color-ok-green)]" : d.result === "loss" ? "text-[var(--color-fail-red)]" : "text-[var(--color-text-3)]"}`}>
                {d.result.toUpperCase()}
              </span>
              <span className="font-mono text-xs text-[var(--color-text-4)]">{d.delta > 0 ? "+" : ""}{d.delta}</span>
              <span className="font-mono text-[11px] text-[var(--color-text-3)] ml-auto">{d.finished_at ? new Date(d.finished_at).toLocaleDateString() : "—"}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Submissions */}
      <section className="space-y-3">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
          Recent Submissions
        </h2>
        <div className="space-y-1">
          {user.submissions.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-2 font-mono text-xs">
              <span className="text-[var(--color-text-2)] truncate flex-1">{s.problem_id}</span>
              <span className="text-[var(--color-text-4)]">{s.language}</span>
              <span className={`${s.status === "accepted" ? "text-[var(--color-ok-green)]" : "text-[var(--color-text-3)]"}`}>{s.status}</span>
              {s.runtime_ms && <span className="text-[var(--color-text-4)]">{s.runtime_ms}ms</span>}
              <span className="text-[var(--color-text-4)]">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

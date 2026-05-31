"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AdminDuelList } from "@/types/admin";

const STATUS_COLORS: Record<string, string> = {
  waiting: "text-[var(--color-text-4)]",
  active: "text-[var(--color-neon-cyan)]",
  finished: "text-[var(--color-ok-green)]",
  complete: "text-[var(--color-ok-green)]",
};

export default function AdminDuelsPage() {
  const [data, setData] = useState<AdminDuelList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchDuels = useCallback(() => {
    const params = new URLSearchParams();
    params.set("offset", String(page * limit));
    params.set("limit", String(limit));
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("q", search);

    api.get<AdminDuelList>(`/admin/duels?${params}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail ?? "Failed to load"));
  }, [statusFilter, search, page]);

  useEffect(() => { fetchDuels(); }, [fetchDuels]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-black tracking-[0.15em] text-white uppercase">
          Duels
        </h1>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)] mt-1">
          {data ? `${data.total} total` : "Loading…"}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search ID or problem name…"
          className="flex-1 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 font-mono text-xs text-[var(--color-text-1)] placeholder:text-[var(--color-text-4)] focus:outline-none focus:border-[var(--color-neon-cyan)]"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 font-mono text-xs text-[var(--color-text-1)] focus:outline-none focus:border-[var(--color-neon-cyan)]"
        >
          <option value="">All statuses</option>
          <option value="waiting">Waiting</option>
          <option value="active">Active</option>
          <option value="finished">Finished</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      {error && (
        <div className="font-mono text-xs text-[var(--color-fail-red)]">
          // {error}
        </div>
      )}

      <div className="space-y-1">
        {data?.duels.map((d) => (
          <Link
            key={d.id}
            href={`/admin/duels/${d.id}`}
            className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-border-hot)] hover:bg-[var(--color-neon-pink)]/5"
          >
            <span className={`font-mono text-[10px] uppercase ${STATUS_COLORS[d.status] ?? ""}`}>
              {d.status}
            </span>
            <span className="font-mono text-xs text-[var(--color-text-2)] truncate flex-1">
              {d.problem_name ?? d.id.slice(0, 8)}
            </span>
            <span className="font-mono text-[11px] text-[var(--color-text-4)]">
              {d.participant_count} players
            </span>
            <span className="font-mono text-[11px] text-[var(--color-text-4)]">
              {d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}
            </span>
          </Link>
        ))}
      </div>

      {data && data.total > limit && (
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="font-mono text-xs tracking-[0.2em] text-[var(--color-neon-cyan)] uppercase disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="font-mono text-xs text-[var(--color-text-4)]">
            {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} / {data.total}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * limit >= data.total}
            className="font-mono text-xs tracking-[0.2em] text-[var(--color-neon-cyan)] uppercase disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

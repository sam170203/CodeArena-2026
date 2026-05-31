"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AdminSubmissionList } from "@/types/admin";

const STATUS_COLORS: Record<string, string> = {
  accepted: "text-[var(--color-ok-green)]",
  queued: "text-[var(--color-text-4)]",
  running: "text-[var(--color-neon-cyan)]",
  rejected: "text-[var(--color-fail-red)]",
  failed: "text-[var(--color-fail-red)]",
};

export default function AdminSubmissionsPage() {
  const [data, setData] = useState<AdminSubmissionList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchSubmissions = useCallback(() => {
    const params = new URLSearchParams();
    params.set("offset", String(page * limit));
    params.set("limit", String(limit));
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("q", search);

    api.get<AdminSubmissionList>(`/admin/submissions?${params}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail ?? "Failed to load"));
  }, [statusFilter, search, page]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-black tracking-[0.15em] text-white uppercase">
          Submissions
        </h1>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)] mt-1">
          {data ? `${data.total} total` : "Loading…"}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by problem ID or user ID…"
          className="flex-1 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 font-mono text-xs text-[var(--color-text-1)] placeholder:text-[var(--color-text-4)] focus:outline-none focus:border-[var(--color-neon-cyan)]"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 font-mono text-xs text-[var(--color-text-1)] focus:outline-none focus:border-[var(--color-neon-cyan)]"
        >
          <option value="">All statuses</option>
          <option value="accepted">Accepted</option>
          <option value="queued">Queued</option>
          <option value="running">Running</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {error && (
        <div className="font-mono text-xs text-[var(--color-fail-red)]">
          // {error}
        </div>
      )}

      <div className="space-y-1">
        {data?.submissions.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 font-mono text-xs"
          >
            <Link
              href={`/admin/users/${s.user_id}`}
              className="text-[var(--color-neon-cyan)] hover:underline truncate max-w-[120px]"
            >
              {s.user_id.slice(0, 12)}…
            </Link>
            <span className="text-[var(--color-text-2)] truncate flex-1">{s.problem_id}</span>
            <span className="text-[var(--color-text-4)]">{s.language}</span>
            <span className={`${STATUS_COLORS[s.status] ?? "text-[var(--color-text-3)]"}`}>
              {s.status}
            </span>
            {s.runtime_ms && <span className="text-[var(--color-text-4)]">{s.runtime_ms}ms</span>}
            {s.score != null && <span className="text-[var(--color-neon-gold)]">{s.score}</span>}
            <span className="text-[var(--color-text-4)] ml-auto">
              {s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}
            </span>
          </div>
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

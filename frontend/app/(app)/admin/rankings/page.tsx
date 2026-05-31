"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AdminRankingsResponse, AdminRanking } from "@/types/admin";

const ROLE_COLORS: Record<string, string> = {
  user: "text-[var(--color-text-4)]",
  moderator: "text-[var(--color-neon-cyan)]",
  admin: "text-[var(--color-neon-pink)]",
  superadmin: "text-[var(--color-neon-gold)]",
};

export default function AdminRankingsPage() {
  const [data, setData] = useState<AdminRankingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState("elo");
  const [order, setOrder] = useState("desc");

  useEffect(() => {
    api.get<AdminRankingsResponse>(`/admin/rankings?sort=${sort}&order=${order}&limit=200`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail ?? "Failed to load"));
  }, [sort, order]);

  const cycleSort = (field: string) => {
    if (sort === field) {
      setOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSort(field);
      setOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-black tracking-[0.15em] text-white uppercase">
          Rankings
        </h1>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)] mt-1">
          Sorted by {sort} ({order}ending)
        </p>
      </div>

      <div className="flex gap-3">
        {["elo", "wins", "xp"].map((field) => (
          <button
            key={field}
            onClick={() => cycleSort(field)}
            className={`font-mono text-xs tracking-[0.2em] uppercase rounded-lg border px-4 py-2 transition ${
              sort === field
                ? "border-[var(--color-neon-pink)] text-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]/10"
                : "border-[var(--color-border)] text-[var(--color-text-3)] hover:border-[var(--color-border-hot)]"
            }`}
          >
            {field} {sort === field ? (order === "desc" ? "↓" : "↑") : ""}
          </button>
        ))}
      </div>

      {error && (
        <div className="font-mono text-xs text-[var(--color-fail-red)]">
          // {error}
        </div>
      )}

      <div className="space-y-1">
        {data?.rankings.map((r) => (
          <Link
            key={r.id}
            href={`/admin/users/${r.id}`}
            className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-border-hot)] hover:bg-[var(--color-neon-pink)]/5"
          >
            <span className="font-mono text-xs text-[var(--color-text-4)] w-8">
              #{r.rank}
            </span>
            <span className="font-mono text-sm text-[var(--color-text-1)] flex-1 truncate">
              {r.username}
            </span>
            {r.cf_handle && (
              <span className="font-mono text-[11px] text-[var(--color-text-3)] hidden sm:inline">
                {r.cf_handle}
              </span>
            )}
            <span className="font-mono text-xs text-[var(--color-neon-gold)] w-16 text-right">
              {r.elo}
            </span>
            <span className="font-mono text-[11px] text-[var(--color-text-2)] text-right">
              {r.duel_wins}W / {r.duel_losses}L
            </span>
            <span className={`font-mono text-[10px] uppercase ${ROLE_COLORS[r.role] ?? ""}`}>
              {r.role}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import type { AdminOverview } from "@/types/admin";

const STAT_TILES = [
  { key: "total_users", label: "Total Users", glyph: "◎" },
  { key: "total_duels", label: "Total Duels", glyph: "⚔" },
  { key: "active_duels", label: "Active Duels", glyph: "◉" },
  { key: "total_submissions", label: "Submissions", glyph: "▣" },
  { key: "users_in_queue", label: "In Queue", glyph: "◈" },
  { key: "new_users_24h", label: "New / 24h", glyph: "⊕" },
  { key: "duels_24h", label: "Duels / 24h", glyph: "↗" },
];

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<AdminOverview>("/admin/overview")
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail ?? "Failed to load"));
  }, []);

  if (error) {
    return (
      <div className="font-mono text-xs text-[var(--color-fail-red)]">
        // {error}
      </div>
    );
  }

  if (!data) {
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
          Admin Overview
        </h1>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)] mt-1">
          System-wide statistics
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {STAT_TILES.map((tile) => {
          const value = data[tile.key as keyof AdminOverview] ?? 0;
          return (
            <Card key={tile.key} className="text-center space-y-2 p-4">
              <div className="text-lg text-[var(--color-neon-cyan)]" aria-hidden>
                {tile.glyph}
              </div>
              <div className="font-display text-2xl font-black text-white">
                {value.toLocaleString()}
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">
                {tile.label}
              </div>
            </Card>
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
          Top Players by ELO
        </h2>
        <div className="space-y-1">
          {data.top_users.map((u, i) => (
            <Link
              key={u.id}
              href={`/admin/users/${u.id}`}
              className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-border-hot)] hover:bg-[var(--color-neon-pink)]/5"
            >
              <span className="font-mono text-xs text-[var(--color-text-4)] w-6">
                #{i + 1}
              </span>
              <span className="font-mono text-sm text-[var(--color-text-1)] flex-1">
                {u.username}
              </span>
              {u.cf_handle && (
                <span className="font-mono text-[11px] text-[var(--color-text-3)]">
                  {u.cf_handle}
                </span>
              )}
              <span className="font-mono text-xs text-[var(--color-neon-gold)]">
                {u.elo}
              </span>
              <span className="font-mono text-[10px] uppercase text-[var(--color-text-4)] border border-[var(--color-border)] rounded px-2 py-0.5">
                {u.role}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

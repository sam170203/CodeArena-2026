"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import type { AdminUserList } from "@/types/admin";

const ROLE_COLORS: Record<string, string> = {
  user: "text-[var(--color-text-4)]",
  moderator: "text-[var(--color-neon-cyan)]",
  admin: "text-[var(--color-neon-pink)]",
  superadmin: "text-[var(--color-neon-gold)]",
};

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUserList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchUsers = useCallback(() => {
    const params = new URLSearchParams();
    params.set("offset", String(page * limit));
    params.set("limit", String(limit));
    if (search) params.set("q", search);
    if (roleFilter) params.set("role", roleFilter);

    api.get<AdminUserList>(`/admin/users?${params}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail ?? "Failed to load"));
  }, [search, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-black tracking-[0.15em] text-white uppercase">
          Users
        </h1>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)] mt-1">
          {data ? `${data.total} total users` : "Loading…"}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search username, email, CF handle…"
          className="flex-1 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 font-mono text-xs text-[var(--color-text-1)] placeholder:text-[var(--color-text-4)] focus:outline-none focus:border-[var(--color-neon-cyan)]"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 font-mono text-xs text-[var(--color-text-1)] focus:outline-none focus:border-[var(--color-neon-cyan)]"
        >
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </div>

      {error && (
        <div className="font-mono text-xs text-[var(--color-fail-red)]">
          // {error}
        </div>
      )}

      <div className="space-y-1">
        {data?.users.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-border-hot)] hover:bg-[var(--color-neon-pink)]/5"
          >
            <span className="font-mono text-sm text-[var(--color-text-1)] flex-1 truncate">
              {u.username}
            </span>
            {u.cf_handle && (
              <span className="font-mono text-[11px] text-[var(--color-text-3)] hidden sm:inline">
                {u.cf_handle}
              </span>
            )}
            <span className="font-mono text-xs text-[var(--color-text-2)] w-16 text-right">
              {u.elo}
            </span>
            <span
              className={`font-mono text-[10px] uppercase ${ROLE_COLORS[u.role] ?? ""} border border-[var(--color-border)] rounded px-2 py-0.5`}
            >
              {u.role}
            </span>
            {u.is_suspended && (
              <span className="font-mono text-[10px] text-[var(--color-fail-red)] uppercase border border-[var(--color-fail-red)] rounded px-2 py-0.5">
                SUSPENDED
              </span>
            )}
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

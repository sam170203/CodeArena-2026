"use client";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { DeckEditor } from "@/components/profile/DeckEditor";
import { CosmeticsEditor } from "@/components/profile/CosmeticsEditor";

export default function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const [cf, setCf] = useState(user?.cf_handle ?? "");
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveCF(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const v = await api.get<{ exists: boolean }>(
        `/cf/handle/${encodeURIComponent(cf)}/validate`
      );
      if (!v.data.exists) {
        setMsg({ err: "Codeforces handle not found." });
        return;
      }
      await api.put("/auth/cf-handle", { cf_handle: cf });
      await refresh();
      setMsg({ ok: "Handle linked." });
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setMsg({ err: ax.response?.data?.detail ?? "Failed to link handle." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl tracking-[-0.5px] text-[var(--color-text-1)]">
        Settings
      </h1>
      <Card>
        <div className="font-mono text-[11px] tracking-[0.25em] text-[var(--color-text-3)] uppercase mb-3">
          Codeforces handle
        </div>
        <form onSubmit={saveCF} className="flex gap-3">
          <input
            value={cf}
            onChange={(e) => setCf(e.target.value)}
            placeholder="your CF handle"
            required
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-sm text-[var(--color-text-1)] outline-none focus:border-[var(--color-border-hot)]"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "..." : "Save"}
          </Button>
        </form>
        {msg?.ok && (
          <div className="mt-3 font-mono text-xs text-[var(--color-ok-green)]">
            {msg.ok}
          </div>
        )}
        {msg?.err && (
          <div className="mt-3 font-mono text-xs text-[var(--color-fail-red)]">
            {msg.err}
          </div>
        )}
      </Card>
      <DeckEditor />

      <CosmeticsEditor />

      <Card>
        <div className="font-mono text-[11px] tracking-[0.25em] text-[var(--color-text-3)] uppercase mb-3">
          Session
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
        >
          Log out
        </Button>
      </Card>
    </div>
  );
}

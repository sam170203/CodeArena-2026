"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.post("/auth/register", {
        username,
        email: email || null,
        password: pw,
        cf_handle: cf || null,
      });
      const tok = await api.post<{ access_token: string }>("/auth/login", {
        username,
        password: pw,
      });
      const token = tok.data.access_token;
      localStorage.setItem("ca_token", token);
      const me = await api.get("/auth/me");
      setSession(token, me.data);
      router.replace("/play");
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setErr(ax.response?.data?.detail ?? "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6 font-mono text-xs tracking-[0.3em] text-[var(--color-neon-pink)]">
        // FORGE YOUR LEGACY
      </div>
      <NeonText as="h1" className="mb-8 text-5xl tracking-[-1px] leading-none">
        Claim a handle.
      </NeonText>
      <form onSubmit={submit} className="space-y-4">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="username"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-hot)]"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="email (optional)"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-hot)]"
        />
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          type="password"
          placeholder="password"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-hot)]"
        />
        <input
          value={cf}
          onChange={(e) => setCf(e.target.value)}
          placeholder="codeforces handle (needed to duel)"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-hot)]"
        />
        {err && (
          <div className="font-mono text-xs text-[var(--color-fail-red)]">{err}</div>
        )}
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "..." : "Forge"}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-[var(--color-text-3)]">
        Already in the arena?{" "}
        <Link
          href="/login"
          className="text-[var(--color-neon-cyan)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}

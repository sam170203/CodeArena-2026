"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams?.get("reason");
  const setSession = useAuth((s) => s.setSession);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const body = id.includes("@")
        ? { email: id, password: pw }
        : { username: id, password: pw };
      const tok = await api.post<{ access_token: string }>("/auth/login", body);
      const token = tok.data.access_token;
      localStorage.setItem("ca_token", token);
      const me = await api.get("/auth/me");
      setSession(token, me.data);
      router.replace("/play");
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setErr(ax.response?.data?.detail ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6 font-mono text-xs tracking-[0.3em] text-[var(--color-neon-pink)]">
        // ENTER THE ARENA
      </div>
      <NeonText as="h1" className="mb-2 text-5xl tracking-[-1px] leading-none">
        Sign in.
      </NeonText>
      <p className="mb-6 text-sm text-[var(--color-text-3)]">
        A challenger appears every minute. Don&apos;t be late.
      </p>
      {reason === "session_expired" && (
        <div className="mb-6 rounded-lg border border-[var(--color-neon-cyan)]/40 bg-[var(--color-neon-cyan)]/[0.06] px-4 py-3">
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-neon-cyan)] uppercase mb-1">
            // session expired
          </div>
          <div className="text-xs text-[var(--color-text-2)]">
            Your previous session is no longer valid. Sign in again — or register if you don&apos;t have an account.
          </div>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
          placeholder="username or email"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-1)] outline-none placeholder:text-[var(--color-text-4)] focus:border-[var(--color-border-hot)]"
        />
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          type="password"
          placeholder="password"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-1)] outline-none placeholder:text-[var(--color-text-4)] focus:border-[var(--color-border-hot)]"
        />
        {err && (
          <div className="font-mono text-xs text-[var(--color-fail-red)]">{err}</div>
        )}
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "..." : "Enter"}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-[var(--color-text-3)]">
        New challenger?{" "}
        <Link
          href="/register"
          className="text-[var(--color-neon-cyan)] hover:underline"
        >
          Register here
        </Link>
      </p>
    </main>
  );
}

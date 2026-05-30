"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/stores/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/primitives/Button";
import { Card } from "@/components/primitives/Card";
import { NeonText } from "@/components/primitives/NeonText";
import { TypedWS, wsUrl } from "@/lib/ws";

type Preset = "chill" | "medium" | "hard";

interface FriendRoom {
  id: string;
  code: string;
  host: { user_id: string; username: string; elo: number; tier: string };
  rating_preset: string;
  deck_tags: string[];
  status: string;
  duel_id: string | null;
}

export default function FriendDuelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuth((s) => s.user);

  const [mode, setMode] = useState<"choose" | "hosting">("choose");
  const [preset, setPreset] = useState<Preset>("medium");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<FriendRoom | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1. If arriving via ?code=XXXXXX from the open lobby, auto-fill the
  //    join input. The user just hits Join.
  useEffect(() => {
    const c = searchParams?.get("code");
    if (c) setJoinCode(c.trim().toUpperCase().slice(0, 6));
  }, [searchParams]);

  // 2. WS for the host: redirect when an opponent joins.
  useEffect(() => {
    if (!user || mode !== "hosting") return;
    const sock = new TypedWS<{ type: string; payload: { duel_id?: string } }>(
      wsUrl(`/ws/user/${user.id}`)
    );
    sock.on((ev) => {
      if (ev.type === "friend_duel_started" && ev.payload.duel_id) {
        router.replace(`/duel/${ev.payload.duel_id}`);
      }
    });
    sock.connect();
    return () => sock.close();
  }, [user, mode, router]);

  const hasCfHandle = !!user?.cf_handle;

  async function createRoom() {
    if (!hasCfHandle) {
      setErr("Link your Codeforces handle in Settings first.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const { data } = await api.post<FriendRoom>("/friend-duel", {
        rating_preset: preset,
      });
      setRoom(data);
      setMode("hosting");
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setErr(ax.response?.data?.detail ?? "Could not create room");
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    if (!hasCfHandle) {
      setErr("Link your Codeforces handle in Settings first.");
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setErr("Codes are exactly 6 characters.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const { data } = await api.post<{ duel_id: string }>(
        "/friend-duel/join",
        { code }
      );
      router.replace(`/duel/${data.duel_id}`);
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setErr(ax.response?.data?.detail ?? "Could not join room");
    } finally {
      setBusy(false);
    }
  }

  async function cancelHost() {
    if (!room) return;
    try {
      await api.delete(`/friend-duel/${room.id}`);
    } catch {}
    setRoom(null);
    setMode("choose");
  }

  function copyCode() {
    if (!room) return;
    navigator.clipboard?.writeText(room.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function copyShareLink() {
    if (!room) return;
    const link = `${window.location.origin}/play/friend?code=${room.code}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="mb-1 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)]">
          // FRIEND DUEL
        </div>
        <NeonText as="h1" className="text-4xl tracking-[-1px]">
          A private arena.
        </NeonText>
        <p className="mt-2 text-sm text-[var(--color-text-3)]">
          Host a room and share the 6-char code, or enter a friend&apos;s code
          to join theirs.
        </p>
      </div>

      {/* CF handle warning — surfaces the requirement BEFORE the user clicks anything */}
      {!hasCfHandle && (
        <Card className="border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/[0.08]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.25em] text-[var(--color-neon-pink)] mb-1 uppercase">
                // Codeforces handle required
              </div>
              <div className="text-sm text-[var(--color-text-1)]">
                You need to link your Codeforces handle before you can host or
                join.
              </div>
            </div>
            <Link
              href="/profile/settings"
              className="font-mono text-[12px] tracking-[0.2em] text-[var(--color-neon-cyan)] uppercase shrink-0"
            >
              Link now →
            </Link>
          </div>
        </Card>
      )}

      {mode === "choose" && (
        <>
          {/* JOIN — moved to top, prominent because the most common arrival
              from the open lobby is via ?code= which pre-fills this. */}
          <Card
            className={
              joinCode
                ? "border-[var(--color-border-hot)] bg-[var(--color-neon-cyan)]/[0.04]"
                : ""
            }
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-[11px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
                Join with code
              </div>
              {joinCode && (
                <span className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-neon-cyan)] uppercase">
                  code pre-filled
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <input
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                }
                placeholder="A1B2C3"
                maxLength={6}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 font-mono text-lg tracking-[0.3em] text-[var(--color-text-1)] outline-none focus:border-[var(--color-border-hot)]"
                autoFocus={!!joinCode}
              />
              <Button
                onClick={joinRoom}
                disabled={busy || joinCode.length !== 6 || !hasCfHandle}
              >
                {busy ? "…" : "Join"}
              </Button>
            </div>
          </Card>

          {/* HOST — secondary. */}
          <Card>
            <div className="mb-3 font-mono text-[11px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
              Host a room
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(["chill", "medium", "hard"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPreset(p)}
                    className={`rounded-lg border px-3 py-2.5 font-mono text-[11px] tracking-[0.15em] uppercase transition ${
                      preset === p
                        ? "border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/10 text-[var(--color-neon-pink)]"
                        : "border-[var(--color-border)] text-[var(--color-text-3)] hover:text-[var(--color-text-1)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-3)]">
                {preset === "chill" &&
                  "Easier curve. Step ratings sit −300 to +100 of base ELO."}
                {preset === "medium" &&
                  "Default curve. ±200 of base ELO across 5 steps."}
                {preset === "hard" &&
                  "Punishing. Steps from −100 to +300 of base ELO."}
              </p>
              <Button
                onClick={createRoom}
                disabled={busy || !hasCfHandle}
                className="w-full"
              >
                {busy ? "…" : "Create room"}
              </Button>
            </div>
          </Card>

          {err && (
            <div className="rounded-lg border border-[var(--color-fail-red)]/40 bg-[var(--color-fail-red)]/[0.06] px-4 py-3 font-mono text-xs text-[var(--color-fail-red)]">
              {err}
            </div>
          )}
        </>
      )}

      {mode === "hosting" && room && (
        <Card className="border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/[0.04]">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)] uppercase">
              // waiting for opponent
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.25em] text-[var(--color-ok-green)] uppercase">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok-green)] animate-pulse"
                style={{ boxShadow: "0 0 8px var(--color-ok-green)" }}
              />
              listening
            </span>
          </div>

          <div className="text-center my-8">
            <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-text-3)] uppercase mb-2">
              Share this code
            </div>
            <div className="font-display text-7xl font-black tracking-[0.2em] text-gradient-pink select-all">
              {room.code}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <Button variant="secondary" onClick={copyCode}>
                {copied ? "Copied ✓" : "Copy code"}
              </Button>
              <Button variant="secondary" onClick={copyShareLink}>
                Copy join link
              </Button>
              <Button variant="ghost" onClick={cancelHost}>
                Cancel
              </Button>
            </div>
            <p className="mt-4 font-mono text-[10px] text-[var(--color-text-3)] tracking-[0.1em]">
              The Join link opens this page with the code pre-filled for your friend.
            </p>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4 grid grid-cols-3 gap-4 text-center font-mono text-[11px]">
            <div>
              <div className="text-[var(--color-text-3)] tracking-[0.2em] uppercase">
                Preset
              </div>
              <div className="text-[var(--color-text-1)] mt-1 uppercase">
                {room.rating_preset}
              </div>
            </div>
            <div>
              <div className="text-[var(--color-text-3)] tracking-[0.2em] uppercase">
                Expires
              </div>
              <div className="text-[var(--color-text-1)] mt-1">15 min</div>
            </div>
            <div>
              <div className="text-[var(--color-text-3)] tracking-[0.2em] uppercase">
                Host
              </div>
              <div className="text-[var(--color-text-1)] mt-1">
                {room.host.username}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

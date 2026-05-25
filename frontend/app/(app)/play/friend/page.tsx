"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const user = useAuth((s) => s.user);

  const [mode, setMode] = useState<"choose" | "hosting" | "joining">("choose");
  const [preset, setPreset] = useState<Preset>("medium");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<FriendRoom | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function createRoom() {
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
    setErr(null);
    setBusy(true);
    try {
      const { data } = await api.post<{ duel_id: string }>("/friend-duel/join", {
        code: joinCode.trim().toUpperCase(),
      });
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
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <div className="mb-1 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)]">
          // FRIEND DUEL
        </div>
        <NeonText as="h1" className="text-4xl tracking-[-1px]">
          A private arena.
        </NeonText>
        <p className="mt-2 text-sm text-[var(--color-text-3)]">
          Host a room and share the 6-char code, or enter a friend&apos;s code to join theirs.
        </p>
      </div>

      {mode === "choose" && (
        <>
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
                {preset === "chill" && "Easier curve. Step ratings sit −300 to +100 of base ELO."}
                {preset === "medium" && "Default curve. ±200 of base ELO across 5 steps."}
                {preset === "hard" && "Punishing. Steps from −100 to +300 of base ELO."}
              </p>
              <Button onClick={createRoom} disabled={busy} className="w-full">
                {busy ? "..." : "Create room"}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="mb-3 font-mono text-[11px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
              Join with code
            </div>
            <div className="flex gap-3">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="A1B2C3"
                maxLength={6}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 font-mono text-lg tracking-[0.3em] text-[var(--color-text-1)] outline-none focus:border-[var(--color-border-hot)]"
              />
              <Button onClick={joinRoom} disabled={busy || joinCode.length !== 6}>
                {busy ? "..." : "Join"}
              </Button>
            </div>
          </Card>

          {err && (
            <div className="font-mono text-xs text-[var(--color-fail-red)]">{err}</div>
          )}
        </>
      )}

      {mode === "hosting" && room && (
        <Card className="border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/[0.04]">
          <div className="mb-2 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)] uppercase">
            // waiting for opponent
          </div>
          <div className="text-center my-8">
            <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-text-3)] uppercase mb-2">
              Share this code
            </div>
            <div className="font-display text-7xl font-black tracking-[0.2em] text-gradient-pink">
              {room.code}
            </div>
            <div className="mt-3 flex gap-2 justify-center">
              <Button variant="secondary" onClick={copyCode}>
                Copy code
              </Button>
              <Button variant="ghost" onClick={cancelHost}>
                Cancel
              </Button>
            </div>
          </div>
          <div className="border-t border-[var(--color-border)] pt-4 grid grid-cols-2 gap-4 text-center font-mono text-[11px]">
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
          </div>
        </Card>
      )}
    </div>
  );
}

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CodeArena duel replay";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface ReplayResp {
  duel_id: string;
  winner_id: string | null;
  duration_seconds: number;
  participants: { user_id: string; username: string; elo: number; tier: string }[];
  steps: { step_index: number }[];
  events: { event_type: string; payload: Record<string, unknown> }[];
}

function formatDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default async function Image({ params }: { params: { id: string } }) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  let replay: ReplayResp | null = null;
  try {
    const r = await fetch(`${apiBase}/replay/${params.id}`, {
      cache: "no-store",
    });
    if (r.ok) replay = (await r.json()) as ReplayResp;
  } catch {
    // fall through to placeholder
  }

  const winnerName =
    replay && replay.winner_id != null
      ? replay.participants.find((p) => p.user_id === replay.winner_id)?.username ?? "—"
      : null;

  const host = replay?.participants[0];
  const opp = replay?.participants[1];

  const lastComplete = replay?.events.find((e) => e.event_type === "duel_complete");
  const eloChanges =
    (lastComplete?.payload?.elo_changes as Record<
      string,
      { delta: number }
    >) ?? {};

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#07020f",
          backgroundImage:
            "radial-gradient(ellipse at 25% 0%, rgba(236,72,153,0.30), transparent 55%), radial-gradient(ellipse at 75% 100%, rgba(168,85,247,0.30), transparent 55%)",
          padding: 60,
          fontFamily: "system-ui",
          color: "#f5f0ff",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: 6,
            color: "#ec4899",
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          // codearena · replay
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1,
            marginTop: 20,
            background: "linear-gradient(180deg, #ffffff, #ec4899 75%)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
          }}
        >
          {winnerName ? `${winnerName} WON.` : "STALEMATE."}
        </div>

        {host && opp && (
          <div
            style={{
              marginTop: 50,
              display: "flex",
              gap: 30,
              alignItems: "center",
            }}
          >
            <Player p={host} delta={eloChanges[host.user_id]?.delta ?? 0} />
            <div
              style={{
                fontSize: 36,
                color: "#7a6fa3",
                fontFamily: "monospace",
              }}
            >
              vs
            </div>
            <Player p={opp} delta={eloChanges[opp.user_id]?.delta ?? 0} />
          </div>
        )}

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "monospace",
            fontSize: 22,
            color: "#7a6fa3",
            letterSpacing: 4,
          }}
        >
          <div style={{ display: "flex", gap: 32 }}>
            <span>{replay ? `${replay.steps.length} steps` : "—"}</span>
            <span>{replay ? formatDur(replay.duration_seconds) : "—"}</span>
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              letterSpacing: 6,
              color: "#ec4899",
              display: "flex",
            }}
          >
            ⚔ CODEARENA
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function Player({
  p,
  delta,
}: {
  p: { username: string; elo: number; tier: string };
  delta: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: -1,
          color: "#f5f0ff",
        }}
      >
        {p.username}
      </div>
      <div
        style={{
          fontSize: 18,
          fontFamily: "monospace",
          letterSpacing: 4,
          color: "#22d3ee",
          marginTop: 4,
        }}
      >
        {p.tier} · ELO {p.elo}
      </div>
      <div
        style={{
          fontSize: 28,
          fontFamily: "monospace",
          fontWeight: 700,
          marginTop: 8,
          color: delta > 0 ? "#34d399" : delta < 0 ? "#ef4444" : "#7a6fa3",
        }}
      >
        {delta > 0 ? "+" : ""}
        {delta} ELO
      </div>
    </div>
  );
}

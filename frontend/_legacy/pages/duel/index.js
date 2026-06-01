import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { duel } from "../../lib/api";
import useAuthStore from "../../store/authStore";
import useToastStore from "../../store/toastStore";

function formatApiError(err) {
  const detail = err?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item?.msg === "string" ? item.msg : JSON.stringify(item)))
      .join(", ");
  }

  if (detail && typeof detail === "object") {
    return detail.msg || JSON.stringify(detail);
  }

  return err?.message || "Something went wrong";
}

function copyText(text, addToast) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text);
    if (addToast) addToast("Copied to clipboard", "success");
  }
}

export default function DuelRoom() {
  const router = useRouter();
  const duelIdRaw = router.query.duelId;
  const duelId = Array.isArray(duelIdRaw) ? duelIdRaw[0] : duelIdRaw;

  const hydrate = useAuthStore((s) => s.hydrate);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);

  const [roomState, setRoomState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [error, setError] = useState("");

  const [hostLookupId, setHostLookupId] = useState("");
  const [joinDuelId, setJoinDuelId] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    hydrate();
    fetchMe();
  }, [hydrate, fetchMe]);

  const refreshRoom = async (roomId = duelId) => {
    if (!roomId) return;

    try {
      setLoadingRoom(true);
      setError("");
      const res = await duel.get(roomId);
      setRoomState(res.data);
    } catch (err) {
      console.error(err);
      setError(formatApiError(err));
      setRoomState(null);
    } finally {
      setLoadingRoom(false);
    }
  };

  useEffect(() => {
    if (!duelId) return;

    refreshRoom(duelId);

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      "ws://127.0.0.1:8000";

    const ws = new WebSocket(`${wsUrl.replace(/\/$/, "")}/ws/duel/${duelId}`);

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);

      if (data?.type === "state" && data?.payload) {
        setRoomState(data.payload);
      }

      if (
        data?.type === "join_room" ||
        data?.type === "start_duel" ||
        data?.type === "end_duel"
      ) {
        refreshRoom(duelId);
      }
    };

    ws.onerror = (err) => console.error("WS Error:", err);

    ws.onclose = () => setConnected(false);

    const poll = setInterval(() => {
      refreshRoom(duelId);
    }, 8000);

    return () => {
      clearInterval(poll);
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId]);

  const isHost = useMemo(() => {
    return !!user?.id && !!roomState?.host_id && roomState.host_id === user.id;
  }, [roomState, user?.id]);

  const isParticipant = useMemo(() => {
    if (!user?.id || !roomState?.participants) return false;
    return roomState.participants.some((p) => p.user_id === user.id);
  }, [roomState, user?.id]);

  const problemLink = useMemo(() => {
    const pid = roomState?.problem_id;
    if (!pid) return null;

    const clean = String(pid).startsWith("cf-") ? String(pid).slice(3) : String(pid);
    const [contestId, index] = clean.split("-");
    if (!contestId || !index) return null;

    return `https://codeforces.com/contest/${contestId}/problem/${index}`;
  }, [roomState]);

  const createRoom = async () => {
    if (!user?.id) {
      setError("Please log in first.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const res = await duel.create({
        host_id: user.id,
        rating: user.cf_rating || 1200,
        max_participants: Number(maxParticipants) || 5,
      });

      router.push(`/duel?duelId=${res.data.duel_id}`);
    } catch (err) {
      console.error(err);
      setError(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const joinByDuelId = async () => {
    if (!user?.id || !joinDuelId.trim()) {
      setError("Enter a duel id first.");
      return;
    }

    try {
      setJoining(true);
      setError("");

      const res = await duel.join({
        duel_id: joinDuelId.trim(),
        opponent_id: user.id,
      });

      router.push(`/duel?duelId=${res.data.id}`);
    } catch (err) {
      console.error(err);
      setError(formatApiError(err));
    } finally {
      setJoining(false);
    }
  };

  const findByHostAndJoin = async () => {
    if (!user?.id || !hostLookupId.trim()) {
      setError("Enter a host id first.");
      return;
    }

    try {
      setJoining(true);
      setError("");

      const res = await duel.findByHost(hostLookupId.trim());
      router.push(`/duel?duelId=${res.data.id}`);
    } catch (err) {
      console.error(err);
      setError(formatApiError(err));
    } finally {
      setJoining(false);
    }
  };

  const startRoom = async () => {
    if (!user?.id || !duelId) return;

    try {
      setStarting(true);
      setError("");

      await duel.start({
        duel_id: duelId,
        user_id: user.id,
      });

      await refreshRoom(duelId);
    } catch (err) {
      console.error(err);
      setError(formatApiError(err));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "40px auto", padding: 20 }}>
      <div
        style={{
          padding: 22,
          borderRadius: 22,
          background: "rgba(15, 15, 20, 0.72)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(22px)",
          marginBottom: 20,
        }}
      >
        <h1 style={{ marginBottom: 8 }}>Duel</h1>
        <div style={{ opacity: 0.82 }}>
          Create a room, join by duel id or host id, then start when ready.
        </div>

        {error && <div style={{ marginTop: 12, color: "#ff8a8a" }}>{error}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div
          style={{
            padding: 20,
            borderRadius: 20,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h3 style={{ marginBottom: 12 }}>Create Duel</h3>

          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ opacity: 0.8 }}>Max participants (up to 5)</label>
            <input
              type="number"
              min={2}
              max={5}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.05)",
                color: "white",
              }}
            />

            <button
              onClick={createRoom}
              disabled={creating}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.12)",
                color: "white",
                cursor: "pointer",
              }}
            >
              {creating ? "Creating..." : "Create Duel Room"}
            </button>
          </div>

          <div style={{ marginTop: 20, opacity: 0.82 }}>
            Host id is your user id. Share the duel id or use host id lookup.
          </div>
        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 20,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h3 style={{ marginBottom: 12 }}>Join Duel</h3>

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ opacity: 0.8 }}>Join by Duel ID</label>
              <input
                value={joinDuelId}
                onChange={(e) => setJoinDuelId(e.target.value)}
                placeholder="Paste duel id"
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                }}
              />
              <button
                onClick={joinByDuelId}
                disabled={joining}
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.12)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {joining ? "Joining..." : "Join by Duel ID"}
              </button>
            </div>

            <div>
              <label style={{ opacity: 0.8 }}>Join by Host ID</label>
              <input
                value={hostLookupId}
                onChange={(e) => setHostLookupId(e.target.value)}
                placeholder="Paste host user id"
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                }}
              />
              <button
                onClick={findByHostAndJoin}
                disabled={joining}
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0, 180, 255, 0.18)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {joining ? "Looking up..." : "Find Active Duel by Host ID"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          padding: 22,
          borderRadius: 22,
          background: "rgba(15, 15, 20, 0.72)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(22px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginBottom: 6 }}>Current Room</h2>
            <div style={{ opacity: 0.82 }}>Duel ID: {duelId || "none"}</div>
            <div style={{ opacity: 0.82 }}>Status: {roomState?.status || (loadingRoom ? "Loading..." : "No room loaded")}</div>
            <div style={{ opacity: 0.82 }}>WebSocket: {connected ? "Connected" : "Disconnected"}</div>
            <div style={{ opacity: 0.82 }}>Target rating: {roomState?.rating_target ?? "—"}</div>
            <div style={{ opacity: 0.82 }}>
              Participants: {roomState?.participants_count ?? 0}/{roomState?.max_participants ?? 5}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
            <button
              onClick={() => refreshRoom(duelId)}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>

            {roomState?.id && (
              <button
                onClick={() => copyText(roomState.id, addToast)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Copy Duel ID
              </button>
            )}

            {isHost && roomState?.status === "waiting" && (
              <button
                onClick={startRoom}
                disabled={starting}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0, 180, 255, 0.18)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {starting ? "Starting..." : "Start Duel"}
              </button>
            )}
          </div>
        </div>

        {roomState?.problem_id && (
          <div style={{ marginTop: 18 }}>
            <a
              href={problemLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                textDecoration: "none",
                color: "white",
              }}
            >
              Open Duel Problem
            </a>
          </div>
        )}

        {roomState?.participants?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Participants</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {roomState.participants.map((p) => (
                <div
                  key={p.user_id}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    background: p.user_id === roomState.host_id ? "rgba(0, 180, 255, 0.12)" : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {p.username} {p.user_id === roomState.host_id ? "(host)" : ""}
                  </div>
                  <div style={{ opacity: 0.8 }}>Rating: {p.cf_rating ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h3>Live Events</h3>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {messages.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No websocket events yet.</div>
          ) : (
            messages.slice(-12).map((msg, i) => (
              <pre
                key={i}
                style={{
                  whiteSpace: "pre-wrap",
                  background: "#111",
                  color: "#eee",
                  padding: 12,
                  borderRadius: 10,
                  margin: 0,
                  fontSize: 12,
                }}
              >
                {JSON.stringify(msg, null, 2)}
              </pre>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
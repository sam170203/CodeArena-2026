import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { duel } from "../../lib/api";
import useAuthStore from "../../store/authStore";

export default function DuelRoom() {
  const router = useRouter();
  const { duelId } = router.query;
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [duelState, setDuelState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [hostId, setHostId] = useState("");
  const [opponentId, setOpponentId] = useState("");

  useEffect(() => {
    hydrate();
    fetchMe();
  }, [hydrate, fetchMe]);

  useEffect(() => {
    if (!duelId || typeof duelId !== "string") return;

    const loadDuel = async () => {
      try {
        const res = await duel.get(duelId);
        setDuelState(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    loadDuel();

    const ws = new WebSocket(`ws://localhost:8000/ws/duel/${duelId}`);

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);

      if (data?.type === "start_duel") {
        setDuelState((prev) => (prev ? { ...prev, status: "active" } : prev));
      }

      if (data?.type === "end_duel") {
        setDuelState((prev) => (prev ? { ...prev, status: "finished" } : prev));
      }
    };

    ws.onerror = (err) => console.error("WS Error:", err);

    return () => ws.close();
  }, [duelId]);

  const createDuel = async () => {
    const res = await duel.create({ host_id: hostId || user?.id, rating: 1200 });
    router.push(`/duel?duelId=${res.data.duel_id}`);
  };

  const joinDuel = async () => {
    await duel.join({ duel_id: duelId, opponent_id: opponentId || user?.id });
    const res = await duel.get(duelId);
    setDuelState(res.data);
  };

  const startDuel = async () => {
    const res = await duel.start(duelId, user?.id);
    setDuelState((prev) => ({
      ...prev,
      status: res.data.status,
      problem_id: res.data.problem_id,
    }));
  };

  if (!duelId) {
    return (
      <div style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
        <h1>Duel Lobby</h1>
        <p>Connected user: {user?.username || "not loaded"}</p>

        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          <input
            value={hostId}
            onChange={(e) => setHostId(e.target.value)}
            placeholder="Host ID (optional, defaults to your user id)"
            style={{ padding: 10 }}
          />
          <button onClick={createDuel}>Create Duel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <h1>Duel Room</h1>
      <p><strong>ID:</strong> {duelId}</p>
      <p><strong>Status:</strong> {duelState?.status || "Loading..."}</p>
      <p><strong>WebSocket:</strong> {connected ? "Connected" : "Connecting..."}</p>

      {!duelState?.opponent_id && (
        <div style={{ marginTop: 16 }}>
          <input
            value={opponentId}
            onChange={(e) => setOpponentId(e.target.value)}
            placeholder="Opponent ID (optional, defaults to your user id)"
            style={{ padding: 10, marginRight: 10 }}
          />
          <button onClick={joinDuel}>Join Duel</button>
        </div>
      )}

      {duelState?.status === "waiting" && (
        <div style={{ marginTop: 16 }}>
          <button onClick={startDuel}>Start Duel</button>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <h3>Live Messages</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {messages.map((msg, i) => (
            <pre key={i} style={{ whiteSpace: "pre-wrap", background: "#111", color: "#eee", padding: 12, borderRadius: 8 }}>
              {JSON.stringify(msg, null, 2)}
            </pre>
          ))}
        </div>
      </div>
    </div>
  );
}
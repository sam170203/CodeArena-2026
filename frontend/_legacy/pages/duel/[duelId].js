import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { duel } from "../../lib/api";

export default function DuelRoom() {
  const router = useRouter();
  const { duelId } = router.query;

  const [duelState, setDuelState] = useState(null);
  const [messages, setMessages] = useState([]);

  const loadDuel = async () => {
    if (!duelId || typeof duelId !== "string") return;
    try {
      const res = await duel.get(duelId);
      setDuelState(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!duelId || typeof duelId !== "string") return;

    loadDuel();

    const ws = new WebSocket(`ws://localhost:8000/ws/duel/${duelId}`);

    ws.onopen = () => {
      console.log("Connected to WS");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    ws.onerror = (err) => {
      console.error("WS Error:", err);
    };

    return () => ws.close();
  }, [duelId]);

  if (!duelId) return <p>Loading...</p>;

  return (
    <div style={{ padding: "30px", color: "white" }}>
      <h1>Duel Room</h1>
      <p>ID: {duelId}</p>

      <h2>Status: {duelState?.status || "Loading..."}</h2>

      <h3>Live Messages:</h3>
      <div>
        {messages.map((msg, i) => (
          <pre key={i}>{JSON.stringify(msg, null, 2)}</pre>
        ))}
      </div>
    </div>
  );
}
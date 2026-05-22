"use client";
import { create } from "zustand";
import { TypedWS, wsUrl } from "@/lib/ws";
import type { QueueEvent } from "@/types/ws";
import { api } from "@/lib/api";

interface OpponentPreview {
  user_id?: string;
  handle?: string | null;
  username: string;
  elo: number;
  tier?: string;
}

interface State {
  queueId: string | null;
  status: "idle" | "searching" | "found" | "cancelled";
  etaSeconds: number;
  queuedCount: number;
  foundDuelId: string | null;
  opponent: OpponentPreview | null;
  socket: TypedWS<QueueEvent> | null;
  enqueue: (userId: string) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

export const useQueue = create<State>((set, get) => ({
  queueId: null,
  status: "idle",
  etaSeconds: 30,
  queuedCount: 0,
  foundDuelId: null,
  opponent: null,
  socket: null,

  async enqueue(userId: string) {
    if (get().status !== "idle") return;
    set({ status: "searching" });
    try {
      const { data } = await api.post<{ queue_id: string; eta_seconds: number }>(
        "/matchmaking/enqueue",
        { mode: "speedrun_ladder" }
      );
      const sock = new TypedWS<QueueEvent>(wsUrl(`/ws/queue/${userId}`));
      sock.on((ev) => {
        if (ev.type === "queue_tick") {
          set({
            etaSeconds: ev.payload.eta_seconds,
            queuedCount: ev.payload.queued_count,
          });
        }
        if (ev.type === "match_found") {
          set({
            status: "found",
            foundDuelId: ev.payload.duel_id,
            opponent: ev.payload.opponent,
          });
        }
      });
      sock.connect();
      set({
        queueId: data.queue_id,
        etaSeconds: data.eta_seconds,
        socket: sock,
      });
    } catch (e) {
      set({ status: "idle" });
      throw e;
    }
  },

  async cancel() {
    const { queueId, socket } = get();
    if (queueId) {
      try {
        await api.delete(`/matchmaking/queue/${queueId}`);
      } catch {
        // ignore
      }
    }
    socket?.close();
    set({
      status: "cancelled",
      queueId: null,
      socket: null,
      opponent: null,
      foundDuelId: null,
    });
  },

  reset() {
    get().socket?.close();
    set({
      status: "idle",
      queueId: null,
      foundDuelId: null,
      etaSeconds: 30,
      queuedCount: 0,
      socket: null,
      opponent: null,
    });
  },
}));

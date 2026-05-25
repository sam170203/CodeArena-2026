"use client";
import { create } from "zustand";
import { TypedWS, wsUrl } from "@/lib/ws";
import type { DuelEvent, EloChange } from "@/types/ws";
import type { Duel } from "@/types/duel";
import { api } from "@/lib/api";

interface RecentEvent {
  ts: number;
  text: string;
}

interface State {
  duel: Duel | null;
  recentEvents: RecentEvent[];
  socket: TypedWS<DuelEvent> | null;
  complete: {
    winnerId: string | null;
    eloChanges: Record<string, EloChange>;
    promotionFor: string | null;
    newTier: string | null;
    demotionFor: string | null;
  } | null;
  load: (duelId: string) => Promise<void>;
  connect: (duelId: string) => void;
  disconnect: () => void;
  reset: () => void;
}

export const useDuel = create<State>((set, get) => ({
  duel: null,
  recentEvents: [],
  socket: null,
  complete: null,

  async load(duelId) {
    const { data } = await api.get<Duel>(`/duel/${duelId}/state`);
    set({ duel: data });
  },

  connect(duelId) {
    if (get().socket) return;
    const sock = new TypedWS<DuelEvent>(wsUrl(`/ws/duel/${duelId}`));
    sock.on((ev) => {
      const d = get().duel;
      if (ev.type === "state") {
        set({ duel: ev.payload.state });
        return;
      }
      if (ev.type === "verdict" && d) {
        const next = structuredClone(d);
        const target =
          next.host?.user_id === ev.payload.user_id
            ? next.host
            : next.opponent && next.opponent.user_id === ev.payload.user_id
            ? next.opponent
            : null;
        if (target) {
          target.last_verdict = {
            verdict: ev.payload.verdict,
            testset: ev.payload.testset,
            submission_id: ev.payload.submission_id,
          };
        }
        const username = target?.username ?? ev.payload.user_id.slice(0, 6);
        set({
          duel: next,
          recentEvents: [
            {
              ts: Date.now(),
              text: `${username} · ${ev.payload.verdict} on step ${
                ev.payload.step_index + 1
              }`,
            },
            ...get().recentEvents,
          ].slice(0, 20),
        });
      }
      if (ev.type === "step_advance" && d) {
        const next = structuredClone(d);
        const target =
          next.host?.user_id === ev.payload.user_id
            ? next.host
            : next.opponent && next.opponent.user_id === ev.payload.user_id
            ? next.opponent
            : null;
        if (target) {
          target.current_step = ev.payload.new_step_index;
        }
        // Update step status too if we have the step
        const step = next.steps[ev.payload.new_step_index - 1];
        if (step) {
          if (next.host?.user_id === ev.payload.user_id)
            step.host_status = "solved";
          else step.opponent_status = "solved";
        }
        set({ duel: next });
      }
      if (ev.type === "duel_complete") {
        set({
          complete: {
            winnerId: ev.payload.winner_id,
            eloChanges: ev.payload.elo_changes,
            promotionFor: ev.payload.promotion_for ?? null,
            newTier: ev.payload.new_tier ?? null,
            demotionFor: ev.payload.demotion_for ?? null,
          },
        });
      }
    });
    sock.connect();
    set({ socket: sock });
  },

  disconnect() {
    get().socket?.close();
    set({ socket: null });
  },

  reset() {
    get().socket?.close();
    set({ duel: null, recentEvents: [], socket: null, complete: null });
  },
}));

"use client";
import { create } from "zustand";
import { TypedWS, wsUrl } from "@/lib/ws";
import type { DuelEvent, EloChange, EmoteGlyph } from "@/types/ws";
import type { Duel } from "@/types/duel";
import { api } from "@/lib/api";

interface RecentEvent {
  ts: number;
  text: string;
}

interface FloatingEmote {
  id: string;
  userId: string;
  glyph: EmoteGlyph;
  receivedAt: number;
}

interface State {
  duel: Duel | null;
  recentEvents: RecentEvent[];
  floatingEmotes: FloatingEmote[];
  socket: TypedWS<DuelEvent> | null;
  // Two timers we manage on the client to make the HUD self-healing:
  refreshTimer: ReturnType<typeof setInterval> | null;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  complete: {
    winnerId: string | null;
    eloChanges: Record<string, EloChange>;
    promotionFor: string | null;
    newTier: string | null;
    demotionFor: string | null;
  } | null;
  forfeitInFlight: boolean;
  load: (duelId: string) => Promise<void>;
  connect: (duelId: string) => void;
  disconnect: () => void;
  reset: () => void;
  sendEmote: (userId: string, glyph: EmoteGlyph) => void;
  dropEmote: (id: string) => void;
  forfeit: (duelId: string) => Promise<void>;
}

export const useDuel = create<State>((set, get) => ({
  duel: null,
  recentEvents: [],
  floatingEmotes: [],
  socket: null,
  refreshTimer: null,
  heartbeatTimer: null,
  complete: null,
  forfeitInFlight: false,

  async load(duelId) {
    const { data } = await api.get<Duel>(`/duel/${duelId}/state`);
    // Merge: preserve client-only transient fields (last_verdict isn't
    // persisted server-side, only delivered via WS) when refreshing.
    set((s) => {
      const prev = s.duel;
      if (!prev) return { duel: data };
      return {
        duel: {
          ...data,
          host: { ...data.host, last_verdict: prev.host?.last_verdict ?? null },
          opponent: data.opponent
            ? {
                ...data.opponent,
                last_verdict: prev.opponent?.last_verdict ?? null,
              }
            : null,
        },
      };
    });
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
        const isHostEvent = next.host?.user_id === ev.payload.user_id;
        const target = isHostEvent
          ? next.host
          : next.opponent && next.opponent.user_id === ev.payload.user_id
          ? next.opponent
          : null;
        if (target) {
          target.current_step = ev.payload.new_step_index;
        }
        // Mark the step that was JUST solved (new_step_index - 1) as solved
        // on the right side. Handles step_index correctly regardless of array
        // order (looks up by step_index field, not array position).
        const solvedIdx = ev.payload.new_step_index - 1;
        const step = next.steps.find((s) => s.step_index === solvedIdx);
        if (step) {
          if (isHostEvent) step.host_status = "solved";
          else step.opponent_status = "solved";
        }
        // Append an activity entry too, so the user gets visible feedback
        // that an advance happened even if the panel UI doesn't pop.
        const username = target?.username ?? ev.payload.user_id.slice(0, 6);
        set({
          duel: next,
          recentEvents: [
            {
              ts: Date.now(),
              text: `${username} · advanced to step ${ev.payload.new_step_index + 1}`,
            },
            ...get().recentEvents,
          ].slice(0, 20),
        });
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
      if (ev.type === "emote") {
        const id = `${ev.payload.user_id}-${ev.payload.sent_at}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        set({
          floatingEmotes: [
            ...get().floatingEmotes,
            {
              id,
              userId: ev.payload.user_id,
              glyph: ev.payload.glyph,
              receivedAt: Date.now(),
            },
          ],
        });
      }
    });
    sock.connect();
    set({ socket: sock });

    // ───── Heartbeat ─────
    // Send "ping" every 25s so Render's edge / proxies don't kill the WS as
    // idle. Without this, long-lived but quiet duels (waiting for the
    // opponent to submit) silently lose the connection after ~60s and we
    // miss verdict events.
    const heartbeat = setInterval(() => {
      try {
        get().socket?.send({ type: "ping" } as never);
      } catch {}
    }, 25_000);

    // ───── Periodic state refresh ─────
    // If a WS event is ever missed (network blip, server hiccup, anything),
    // re-fetching the duel state every 10s self-heals. Cheap GET, no harm.
    const refresh = setInterval(() => {
      const c = get().complete;
      if (c) return; // duel already over, stop polling
      get().load(duelId).catch(() => {});
    }, 10_000);

    set({ heartbeatTimer: heartbeat, refreshTimer: refresh });
  },

  disconnect() {
    const { socket, heartbeatTimer, refreshTimer } = get();
    socket?.close();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (refreshTimer) clearInterval(refreshTimer);
    set({ socket: null, heartbeatTimer: null, refreshTimer: null });
  },

  reset() {
    const { socket, heartbeatTimer, refreshTimer } = get();
    socket?.close();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (refreshTimer) clearInterval(refreshTimer);
    set({
      duel: null,
      recentEvents: [],
      floatingEmotes: [],
      socket: null,
      heartbeatTimer: null,
      refreshTimer: null,
      complete: null,
    });
  },

  sendEmote(userId, glyph) {
    const sock = get().socket;
    if (!sock) return;
    sock.send({ type: "emote", user_id: userId, glyph });
  },

  dropEmote(id) {
    set({ floatingEmotes: get().floatingEmotes.filter((e) => e.id !== id) });
  },

  async forfeit(duelId) {
    if (get().forfeitInFlight) return;
    set({ forfeitInFlight: true });
    try {
      const { data } = await api.post<{ winner_id: string | null }>(
        `/duel/${duelId}/forfeit`
      );
      // OPTIMISTIC LOCAL UPDATE: backend has accepted the forfeit. The full
      // duel_complete WS event with elo_changes will arrive shortly, but we
      // immediately seed `complete` so the UI stops feeling hung. The
      // VictoryOverlay still needs eloChanges to render, so we render a
      // lightweight "duel ending…" splash from forfeitInFlight in the meantime.
      set((s) => ({
        complete: s.complete ?? {
          winnerId: data.winner_id ?? null,
          eloChanges: {}, // WS event will fill these in
          promotionFor: null,
          newTier: null,
          demotionFor: null,
        },
      }));
    } finally {
      set({ forfeitInFlight: false });
    }
  },
}));

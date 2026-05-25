"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDuel } from "@/stores/duel";
import { useAuth } from "@/stores/auth";
import type { EmoteGlyph } from "@/types/ws";

const GLYPH_MAP: Record<EmoteGlyph, { symbol: string; tone: string }> = {
  gg:       { symbol: "✓", tone: "var(--color-ok-green)" },
  fire:     { symbol: "▲", tone: "var(--color-neon-pink)" },
  thinking: { symbol: "?", tone: "var(--color-neon-cyan)" },
  coffee:   { symbol: "♨", tone: "var(--color-neon-gold)" },
  salt:     { symbol: "✕", tone: "var(--color-fail-red)" },
  exclaim:  { symbol: "!", tone: "var(--color-neon-violet)" },
};

export function FloatingEmotes() {
  const me = useAuth((s) => s.user);
  const duel = useDuel((s) => s.duel);
  const floating = useDuel((s) => s.floatingEmotes);
  const dropEmote = useDuel((s) => s.dropEmote);

  useEffect(() => {
    if (floating.length === 0) return;
    const timers = floating.map((e) => setTimeout(() => dropEmote(e.id), 2200));
    return () => timers.forEach(clearTimeout);
  }, [floating, dropEmote]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[40]">
      <AnimatePresence>
        {floating.map((e, idx) => {
          const isMe = me && e.userId === me.id;
          // me on left, opp on right; if neither known, default to centre
          const meIsHost = me && duel?.host?.user_id === me.id;
          const userIsHost = duel?.host?.user_id === e.userId;
          const onLeft = meIsHost ? userIsHost : !userIsHost;

          const x = onLeft ? "12%" : "78%";
          const symbol = GLYPH_MAP[e.glyph].symbol;
          const tone = GLYPH_MAP[e.glyph].tone;

          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 40, scale: 0.4, x }}
              animate={{ opacity: [0, 1, 1, 0], y: -60, scale: 1.1, x }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: "easeOut" }}
              className="absolute top-[55%]"
              style={{
                color: tone,
                fontFamily: "var(--font-orbitron), sans-serif",
                fontWeight: 900,
                fontSize: "72px",
                textShadow: `0 0 24px ${tone}`,
                marginTop: idx * 8,
              }}
            >
              {symbol}
              {isMe && (
                <div className="font-mono text-[8px] tracking-[0.25em] text-center mt-1 opacity-70">
                  YOU
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

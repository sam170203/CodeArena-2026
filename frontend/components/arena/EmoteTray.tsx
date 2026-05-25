"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useDuel } from "@/stores/duel";
import type { EmoteGlyph } from "@/types/ws";
import { cn } from "@/lib/cn";

const GLYPHS: { key: EmoteGlyph; label: string; symbol: string; tone: string }[] = [
  { key: "gg", label: "GG", symbol: "✓", tone: "var(--color-ok-green)" },
  { key: "fire", label: "Fire", symbol: "▲", tone: "var(--color-neon-pink)" },
  { key: "thinking", label: "Thinking", symbol: "?", tone: "var(--color-neon-cyan)" },
  { key: "coffee", label: "Coffee", symbol: "♨", tone: "var(--color-neon-gold)" },
  { key: "salt", label: "Salt", symbol: "✕", tone: "var(--color-fail-red)" },
  { key: "exclaim", label: "!", symbol: "!", tone: "var(--color-neon-violet)" },
];

export function EmoteTray() {
  const [open, setOpen] = useState(false);
  const me = useAuth((s) => s.user);
  const sendEmote = useDuel((s) => s.sendEmote);

  const send = (g: EmoteGlyph) => {
    if (!me) return;
    sendEmote(me.id, g);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded border border-[var(--color-border)] px-3 py-1.5 font-mono text-[10px] tracking-[0.25em] uppercase transition",
          open
            ? "border-[var(--color-border-hot)] text-[var(--color-neon-pink)]"
            : "text-[var(--color-text-3)] hover:text-[var(--color-text-1)] hover:border-[var(--color-border-hot)]"
        )}
      >
        ✦ EMOTE
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-30 grid grid-cols-3 gap-1.5 rounded-lg border border-[var(--color-border-hot)] bg-[var(--color-surface)] p-2"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
          >
            {GLYPHS.map((g) => (
              <button
                key={g.key}
                onClick={() => send(g.key)}
                title={g.label}
                className="flex h-10 w-10 items-center justify-center rounded border border-[var(--color-border)] font-display text-xl font-black transition hover:scale-110 hover:border-[var(--color-border-hot)]"
                style={{ color: g.tone, textShadow: `0 0 8px ${g.tone}` }}
              >
                {g.symbol}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

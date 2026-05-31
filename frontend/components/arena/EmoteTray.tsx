"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useDuel } from "@/stores/duel";
import type { EmoteGlyph } from "@/types/ws";
import { cn } from "@/lib/cn";

const GLYPHS: { key: EmoteGlyph; label: string; symbol: string; tone: string }[] = [
  { key: "gg",       label: "GG",       symbol: "✓", tone: "var(--color-ok-green)" },
  { key: "fire",     label: "Fire",     symbol: "▲", tone: "var(--color-neon-pink)" },
  { key: "thinking", label: "Thinking", symbol: "?", tone: "var(--color-neon-cyan)" },
  { key: "coffee",   label: "Coffee",   symbol: "♨", tone: "var(--color-neon-gold)" },
  { key: "salt",     label: "Salt",     symbol: "✕", tone: "var(--color-fail-red)" },
  { key: "exclaim",  label: "!",        symbol: "!", tone: "var(--color-neon-violet)" },
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
        title="Send emote to your opponent"
        className={cn(
          "rounded-md border-2 px-3 py-1.5 font-display text-xs tracking-[0.25em] uppercase transition",
          open
            ? "border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]/10 text-[var(--color-neon-pink)]"
            : "border-[var(--color-neon-cyan)]/60 bg-[var(--color-neon-cyan)]/[0.06] text-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/[0.12]"
        )}
        style={{ boxShadow: "0 0 12px rgba(34,211,238,0.18)" }}
      >
        <span aria-hidden className="mr-1.5">✦</span>EMOTE
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            // z-[90] puts it above the duel header (z-auto) and the modal
            // overlay (z-80) — so the popover is never visually clipped.
            className="absolute right-0 top-full mt-2 z-[90] rounded-xl border-2 border-[var(--color-border-hot)] bg-[var(--color-surface)] p-3"
            style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(236,72,153,0.2)" }}
          >
            <div className="mb-2 font-mono text-[10px] tracking-[0.3em] text-[var(--color-text-3)] uppercase text-center">
              // pick an emote
            </div>
            <div className="grid grid-cols-3 gap-2">
              {GLYPHS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => send(g.key)}
                  title={g.label}
                  className="flex h-12 w-12 flex-col items-center justify-center rounded-lg border border-[var(--color-border)] font-display text-2xl font-black transition hover:scale-110 hover:border-[var(--color-border-hot)]"
                  style={{ color: g.tone, textShadow: `0 0 10px ${g.tone}` }}
                >
                  <span>{g.symbol}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 font-mono text-[9px] tracking-[0.15em] text-[var(--color-text-4)] text-center">
              opponent sees it instantly · 4/min
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

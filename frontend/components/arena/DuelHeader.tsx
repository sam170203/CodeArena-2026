"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDuel } from "@/stores/duel";
import { DuelTimer } from "./DuelTimer";
import { EmoteTray } from "./EmoteTray";
import { Button } from "@/components/primitives/Button";

interface Props {
  duelId: string;
  opponentName: string;
  startedAt: string;
  capSeconds: number;
  duelStatus: string;
  spectatorMode?: boolean;
}

export function DuelHeader({
  duelId,
  opponentName,
  startedAt,
  capSeconds,
  duelStatus,
  spectatorMode = false,
}: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const forfeit = useDuel((s) => s.forfeit);
  const forfeitInFlight = useDuel((s) => s.forfeitInFlight);

  const isActive = duelStatus === "active";

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-[var(--color-border-hot)] bg-gradient-to-r from-[var(--color-neon-pink)]/[0.08] via-[var(--color-surface)] to-[var(--color-neon-violet)]/[0.08]">
        {/* subtle scanlines overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.02) 3px 4px)",
          }}
        />
        <div className="relative flex items-center justify-between gap-4 px-5 py-3.5">
          {/* Left — duel identity */}
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-neon-pink)]"
              style={{ boxShadow: "0 0 12px var(--color-neon-pink)" }}
            >
              <span className="absolute inset-0 rounded-full bg-[var(--color-neon-pink)] opacity-60 animate-ping" />
            </span>
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-pink)] uppercase">
                {spectatorMode ? "// spectating" : "// live duel"}
              </div>
              <div className="font-display text-base font-bold tracking-[-0.5px] text-[var(--color-text-1)] truncate">
                {spectatorMode ? "watching" : "duelling"}{" "}
                <span className="text-[var(--color-neon-cyan)]">vs {opponentName}</span>
              </div>
            </div>
          </div>

          {/* Center — timer */}
          <div className="hidden sm:block">
            <DuelTimer startedAt={startedAt} capSeconds={capSeconds} />
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-2.5">
            {!spectatorMode && <EmoteTray />}
            {!spectatorMode && isActive && (
              <button
                onClick={() => setShowConfirm(true)}
                className="rounded border border-[var(--color-fail-red)]/50 bg-[var(--color-fail-red)]/[0.08] px-3 py-1.5 font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--color-fail-red)] transition hover:bg-[var(--color-fail-red)]/[0.15] hover:border-[var(--color-fail-red)]"
              >
                ✕ Forfeit
              </button>
            )}
            <a
              href={spectatorMode ? "/play/lobby" : "/play"}
              className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] hover:text-[var(--color-text-1)] uppercase"
              title={spectatorMode ? "Back to lobby (keep watching in another tab)" : "Leave page (duel continues — opponent will win on time-out unless you return)"}
            >
              ◀ {spectatorMode ? "lobby" : "exit"}
            </a>
          </div>
        </div>

        {/* Timer fallback for narrow screens */}
        <div className="sm:hidden border-t border-[var(--color-border)] px-5 py-2 text-center">
          <DuelTimer startedAt={startedAt} capSeconds={capSeconds} />
        </div>
      </div>

      {/* Confirm-forfeit modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--color-bg-void)]/80 backdrop-blur"
            onClick={() => !forfeitInFlight && setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="mx-4 max-w-sm rounded-2xl border border-[var(--color-fail-red)]/40 bg-[var(--color-surface)] p-6"
              style={{ boxShadow: "0 0 40px rgba(239,68,68,0.25)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 font-mono text-[11px] tracking-[0.3em] text-[var(--color-fail-red)] uppercase">
                // forfeit duel
              </div>
              <div className="mb-2 font-display text-2xl font-bold tracking-[-0.5px] text-[var(--color-text-1)]">
                Give up the arena?
              </div>
              <p className="mb-5 text-sm text-[var(--color-text-3)]">
                <span className="text-[var(--color-neon-cyan)]">{opponentName}</span>{" "}
                will be declared the winner. You'll lose ELO. There's no undo.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowConfirm(false)}
                  disabled={forfeitInFlight}
                  className="flex-1"
                >
                  Keep dueling
                </Button>
                <button
                  onClick={() => forfeit(duelId)}
                  disabled={forfeitInFlight}
                  className="flex-1 rounded-lg border border-[var(--color-fail-red)] bg-[var(--color-fail-red)]/[0.12] px-4 py-2.5 font-display font-extrabold text-xs tracking-[0.2em] uppercase text-[var(--color-fail-red)] transition hover:bg-[var(--color-fail-red)]/[0.2] disabled:opacity-50"
                >
                  {forfeitInFlight ? "…" : "Forfeit"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

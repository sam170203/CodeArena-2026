"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { TierBadge } from "@/components/cosmetic/TierBadge";

interface Props {
  newTier: string;
  newElo: number;
  onDone: () => void;
}

export function PromotionCeremony({ newTier, newElo, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-bg-void)]"
      onClick={onDone}
    >
      {/* particles */}
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: Math.cos((i / 24) * Math.PI * 2) * 220,
            y: Math.sin((i / 24) * Math.PI * 2) * 220,
          }}
          transition={{ duration: 1.6, delay: 0.3 + (i % 6) * 0.04 }}
          className="absolute h-1 w-1 rounded-full"
          style={{
            background: i % 2 ? "var(--color-neon-pink)" : "var(--color-neon-cyan)",
            boxShadow: "0 0 8px currentColor",
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, letterSpacing: "0em" }}
        animate={{ opacity: 1, letterSpacing: "0.4em" }}
        transition={{ duration: 0.6 }}
        className="font-mono text-[11px] text-[var(--color-neon-pink)] mb-6 uppercase"
      >
        // promoted
      </motion.div>

      <motion.div
        initial={{ scale: 0, rotate: -120, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <TierBadge elo={newElo} size="lg" />
      </motion.div>

      <motion.h1
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-8 font-display text-6xl font-black tracking-[-2px] text-gradient-pink uppercase"
      >
        {newTier}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.0 }}
        className="mt-4 font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase"
      >
        ELO {newElo}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.8 }}
        className="absolute bottom-12 font-mono text-[10px] tracking-[0.3em] text-[var(--color-text-3)] uppercase"
      >
        tap to continue
      </motion.div>
    </motion.div>
  );
}

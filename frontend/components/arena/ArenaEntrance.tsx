"use client";
import { motion } from "framer-motion";

export function ArenaEntrance({ opponentName }: { opponentName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg-void)]"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="font-mono text-[12px] tracking-[0.4em] text-[var(--color-neon-pink)] mb-4"
      >
        // A CHALLENGER APPEARS
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="font-display text-7xl font-black tracking-[-2px] text-gradient-pink"
      >
        {opponentName}
      </motion.h1>
    </motion.div>
  );
}

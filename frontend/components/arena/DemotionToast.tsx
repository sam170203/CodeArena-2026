"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  show: boolean;
}

export function DemotionToast({ show }: Props) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    if (!show) return;
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -8, x: "-50%" }}
          transition={{ duration: 0.3 }}
          className="fixed top-6 left-1/2 z-[70] rounded-lg border border-[var(--color-neon-violet)]/40 bg-[var(--color-surface)] px-5 py-3 backdrop-blur"
          style={{ boxShadow: "0 0 24px rgba(168,85,247,0.3)" }}
        >
          <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-violet)] uppercase">
            // tier dropped
          </div>
          <div className="mt-0.5 font-display text-sm font-bold text-[var(--color-text-1)]">
            Your standing slips. Reclaim it.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

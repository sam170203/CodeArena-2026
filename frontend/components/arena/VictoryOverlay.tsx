"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { NumberTicker } from "./NumberTicker";

interface Props {
  result: "win" | "loss" | "draw";
  myEloBefore: number;
  myEloAfter: number;
  myDelta: number;
  duelId?: string;
}

export function VictoryOverlay({
  result,
  myEloBefore,
  myEloAfter,
  myDelta,
  duelId,
}: Props) {
  const title = result === "win" ? "VICTORY." : result === "loss" ? "DEFEAT." : "DRAW.";
  const tone =
    result === "win"
      ? "from-white to-[var(--color-ok-green)]"
      : result === "loss"
      ? "from-white to-[var(--color-neon-pink)]"
      : "from-white to-[var(--color-neon-cyan)]";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg-void)]/95 backdrop-blur"
    >
      <motion.h1
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`font-display font-black text-8xl tracking-[-3px] bg-gradient-to-b ${tone} bg-clip-text text-transparent`}
      >
        {title}
      </motion.h1>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-8 flex items-center gap-6"
      >
        <div className="text-center">
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            ELO
          </div>
          <div className="font-mono text-4xl font-bold text-[var(--color-text-1)]">
            <NumberTicker from={myEloBefore} to={myEloAfter} />
          </div>
          <div
            className={`font-mono text-sm ${
              myDelta >= 0
                ? "text-[var(--color-ok-green)]"
                : "text-[var(--color-fail-red)]"
            }`}
          >
            {myDelta >= 0 ? "+" : ""}
            {myDelta}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mt-12 flex gap-3"
      >
        <Link href="/play">
          <Button size="lg">Back to arena</Button>
        </Link>
        {duelId && (
          <Link href={`/duel/${duelId}/replay`}>
            <Button size="lg" variant="secondary">
              View replay
            </Button>
          </Link>
        )}
        <Link href="/leaderboard">
          <Button size="lg" variant="ghost">
            Leaderboard
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}

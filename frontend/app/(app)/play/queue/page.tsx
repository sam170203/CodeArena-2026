"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useQueue } from "@/stores/queue";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";
import { ArenaEntrance } from "@/components/arena/ArenaEntrance";

export default function QueuePage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const { status, etaSeconds, queuedCount, foundDuelId, opponent, enqueue, cancel, reset } =
    useQueue();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!user) return;
    if (status === "idle") {
      enqueue(user.id).catch(() => {});
    }
  }, [user, status, enqueue]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (status === "found" && foundDuelId) {
      const id = foundDuelId;
      const goto = setTimeout(() => {
        reset();
        router.replace(`/duel/${id}`);
      }, 1500);
      return () => clearTimeout(goto);
    }
  }, [status, foundDuelId, router, reset]);

  if (status === "found") {
    return <ArenaEntrance opponentName={opponent?.username ?? "Challenger"} />;
  }

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="mb-6 font-mono text-[12px] tracking-[0.4em] text-[var(--color-neon-pink)]">
        // SEARCHING…
      </div>
      <NeonText as="h1" className="text-5xl tracking-[-1.5px] mb-10">
        Finding a worthy opponent.
      </NeonText>

      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          boxShadow: [
            "0 0 30px rgba(236,72,153,0.3)",
            "0 0 60px rgba(236,72,153,0.5)",
            "0 0 30px rgba(236,72,153,0.3)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="my-8 flex h-32 w-32 items-center justify-center rounded-full border-2 border-[var(--color-neon-pink)] text-[var(--color-neon-pink)] font-display text-4xl font-black"
      >
        ⚔
      </motion.div>

      <div className="grid grid-cols-3 gap-8 text-center mb-10">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            Queue ETA
          </div>
          <div className="font-mono text-2xl text-[var(--color-text-1)]">~{etaSeconds}s</div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            In queue
          </div>
          <div className="font-mono text-2xl text-[var(--color-text-1)]">{queuedCount}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            Elapsed
          </div>
          <div className="font-mono text-2xl text-[var(--color-text-1)]">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        onClick={async () => {
          await cancel();
          router.replace("/play");
        }}
      >
        Cancel queue
      </Button>
    </div>
  );
}

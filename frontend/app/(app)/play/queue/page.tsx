"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useQueue } from "@/stores/queue";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";
import { ArenaEntrance } from "@/components/arena/ArenaEntrance";

export default function QueuePage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const {
    status,
    etaSeconds,
    queuedCount,
    foundDuelId,
    opponent,
    enqueue,
    cancel,
    reset,
  } = useQueue();
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Hard precondition: no CF handle, no queue. Send the user to settings
    // instead of letting them sit on a forever-spinner.
    if (!user.cf_handle) {
      router.replace("/profile/settings?from=play");
      return;
    }
    if (status === "idle") {
      enqueue(user.id).catch((e) => {
        const ax = e as { response?: { data?: { detail?: string } } };
        setErr(
          ax.response?.data?.detail ??
            "Could not join the queue. The backend may be cold-starting — try again in a few seconds."
        );
      });
    }
  }, [user, status, enqueue, router]);

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

  // ERROR STATE — formerly a silent fail
  if (err) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="mb-3 font-mono text-[12px] tracking-[0.4em] text-[var(--color-fail-red)]">
          // queue failed
        </div>
        <NeonText as="h1" className="text-3xl sm:text-4xl tracking-[-1px] mb-3">
          Couldn&apos;t enter the arena.
        </NeonText>
        <p className="mb-7 max-w-md text-sm text-[var(--color-text-3)]">{err}</p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button
            onClick={() => {
              setErr(null);
              reset();
            }}
          >
            Try again
          </Button>
          <Link href="/play">
            <Button variant="ghost">Back to dashboard</Button>
          </Link>
          <Link href="/profile/settings">
            <Button variant="secondary">Check settings</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === "found") {
    return <ArenaEntrance opponentName={opponent?.username ?? "Challenger"} />;
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-24 px-4 text-center">
      <div className="mb-6 font-mono text-[11px] sm:text-[12px] tracking-[0.4em] text-[var(--color-neon-pink)]">
        // SEARCHING…
      </div>
      <NeonText as="h1" className="text-3xl sm:text-5xl tracking-[-1.5px] mb-8 sm:mb-10">
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
        className="my-6 sm:my-8 flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-full border-2 border-[var(--color-neon-pink)] text-[var(--color-neon-pink)] font-display text-3xl sm:text-4xl font-black"
      >
        ⚔
      </motion.div>

      <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center mb-8 sm:mb-10 max-w-md">
        <div>
          <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            ETA
          </div>
          <div className="font-mono text-xl sm:text-2xl text-[var(--color-text-1)]">
            ~{etaSeconds}s
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            Queued
          </div>
          <div className="font-mono text-xl sm:text-2xl text-[var(--color-text-1)]">
            {queuedCount}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            Elapsed
          </div>
          <div className="font-mono text-xl sm:text-2xl text-[var(--color-text-1)]">
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

      <p className="mt-6 max-w-md font-mono text-[10px] text-[var(--color-text-4)] tracking-[0.1em]">
        first match can take 30–60 seconds. backend on free render tier may take a few extra seconds on cold start.
      </p>
    </div>
  );
}

"use client";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";

export function HeroBattleCard({ onBattle }: { onBattle: () => void }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--color-border-hot)] bg-[var(--color-surface)] p-6 sm:p-10"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 30% 30%, rgba(236,72,153,0.18), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(168,85,247,0.18), transparent 55%)",
        boxShadow: "inset 0 0 60px rgba(236,72,153,0.12)",
      }}
    >
      <div className="mb-2 font-mono text-[10px] sm:text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)]">
        // THE ARENA AWAITS
      </div>
      <NeonText as="h1" className="text-4xl sm:text-6xl tracking-[-2px] leading-[0.95]">
        Step into
        <br />
        the duel.
      </NeonText>
      <p className="mt-4 sm:mt-5 max-w-[480px] text-sm sm:text-[15px] leading-relaxed text-[var(--color-text-2)]">
        A ladder of five problems. Each step raises the rating. First to clear
        the ladder advances their legacy. Last to reach the next problem…
        retreats.
      </p>
      <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-2.5 sm:gap-3.5">
        <Button size="lg" onClick={onBattle}>
          ⚔ Enter arena
        </Button>
        <Link href="/play/friend">
          <Button variant="secondary">Friend duel</Button>
        </Link>
        <Link href="/play/lobby" className="hidden sm:inline-block">
          <Button variant="ghost">Browse lobbies</Button>
        </Link>
      </div>
    </div>
  );
}

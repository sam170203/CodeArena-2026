import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 font-mono text-xs tracking-[0.3em] text-[var(--color-neon-pink)]">
        // CODE · ARENA · 2026
      </div>
      <NeonText as="h1" className="text-7xl tracking-[-2px] leading-[0.95]">
        Step into
        <br />
        the duel.
      </NeonText>
      <p className="mt-6 max-w-2xl text-base text-[var(--color-text-2)]">
        Real-time Codeforces duels. A ladder of five problems, each step raising
        the rating. First to clear the ladder advances their legacy. Last to reach
        the next problem retreats.
      </p>
      <div className="mt-10 flex gap-4">
        <Link href="/register">
          <Button size="lg">Enter the arena</Button>
        </Link>
        <Link href="/login">
          <Button size="lg" variant="ghost">
            I have a handle
          </Button>
        </Link>
      </div>
      <div className="mt-16 grid grid-cols-3 gap-12 text-left text-sm text-[var(--color-text-3)]">
        <div>
          <div className="mb-1 font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-cyan)]">
            // 01
          </div>
          <div className="text-[var(--color-text-1)] font-semibold mb-1">
            Quick match
          </div>
          <p>
            Matched by ELO. ~30 second queue, ~25 minute duel. Clash-Royale-paced
            tension, no waiting room.
          </p>
        </div>
        <div>
          <div className="mb-1 font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-cyan)]">
            // 02
          </div>
          <div className="text-[var(--color-text-1)] font-semibold mb-1">
            Real Codeforces
          </div>
          <p>
            Link your handle. Submit on Codeforces. We watch the verdict tape in
            real time and update the arena live.
          </p>
        </div>
        <div>
          <div className="mb-1 font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-cyan)]">
            // 03
          </div>
          <div className="text-[var(--color-text-1)] font-semibold mb-1">
            Earn your tier
          </div>
          <p>
            Climb from Bronze to Legend. Every duel changes your standing. Every
            promotion is a moment.
          </p>
        </div>
      </div>
    </main>
  );
}

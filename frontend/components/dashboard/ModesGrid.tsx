import Link from "next/link";
import { cn } from "@/lib/cn";

const MODES = [
  {
    href: "/play/queue",
    glyph: "QM",
    name: "Quick match",
    desc: "Matched by ELO ±150. ~30s queue, ~25 min duel.",
    tone: "pink" as const,
  },
  {
    href: "/play/friend",
    glyph: "FD",
    name: "Friend duel",
    desc: "Private room with 6-char code. Pick the curve.",
    tone: "cyan" as const,
  },
  {
    href: "/play/lobby",
    glyph: "OL",
    name: "Open lobby",
    desc: "Browse public rooms. Spectate or jump in.",
    tone: "violet" as const,
  },
  {
    href: "/play/async",
    glyph: "AC",
    name: "Async challenge",
    desc: "Challenge a friend. 24 h to play.",
    tone: "gold" as const,
  },
];

const TONE = {
  pink: "bg-[var(--color-neon-pink)]/15 text-[var(--color-neon-pink)]",
  cyan: "bg-[var(--color-neon-cyan)]/15 text-[var(--color-neon-cyan)]",
  violet: "bg-[var(--color-neon-violet)]/15 text-[var(--color-neon-violet)]",
  gold: "bg-[var(--color-neon-gold)]/15 text-[var(--color-neon-gold)]",
};

export function ModesGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {MODES.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-border-hot)]"
        >
          <div
            className={cn(
              "mb-3.5 flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm font-extrabold",
              TONE[m.tone]
            )}
          >
            {m.glyph}
          </div>
          <div className="font-display text-[13px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-1)]">
            {m.name}
          </div>
          <div className="mt-1 text-xs leading-relaxed text-[var(--color-text-3)]">
            {m.desc}
          </div>
        </Link>
      ))}
    </div>
  );
}

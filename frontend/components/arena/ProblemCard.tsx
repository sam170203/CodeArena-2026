import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { VerdictPill, Verdict } from "@/components/primitives/VerdictPill";

interface Props {
  rating: number;
  step: number;
  total: number;
  contestId: number;
  index: string;
  name: string;
  tags: string[];
  lastVerdict?: { verdict: Verdict; testset?: number } | null;
}

export function ProblemCard({
  rating,
  step,
  total,
  contestId,
  index,
  name,
  tags,
  lastVerdict,
}: Props) {
  const url = `https://codeforces.com/contest/${contestId}/problem/${index}`;
  return (
    <Card className="w-full max-w-2xl mx-auto p-10 text-center border-[var(--color-border-hot)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg-haze)]">
      <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)] mb-2">
        // CURRENT STEP · {rating}
      </div>
      <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] mb-4 uppercase">
        Step {step + 1} of {total}
      </div>
      <h2 className="font-display text-3xl font-bold tracking-[-1px] text-[var(--color-text-1)] mb-2">
        {contestId}
        {index} — {name}
      </h2>
      <div className="mb-7 font-mono text-[11px] tracking-[0.1em] text-[var(--color-text-3)]">
        {rating} · {tags.join(", ") || "—"}
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Button size="lg">↗ Open on Codeforces</Button>
      </a>
      {lastVerdict && (
        <div className="mt-7 inline-flex items-center gap-3 font-mono text-xs text-[var(--color-text-3)]">
          last submission: <VerdictPill verdict={lastVerdict.verdict} testset={lastVerdict.testset} />
        </div>
      )}
    </Card>
  );
}

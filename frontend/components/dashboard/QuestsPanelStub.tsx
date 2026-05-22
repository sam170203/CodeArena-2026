import { Card } from "@/components/primitives/Card";

export function QuestsPanelStub() {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">
          Today&apos;s quests
        </div>
        <span className="font-mono text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.2em]">
          soon
        </span>
      </div>
      <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">
        Quests system lands in Phase 2.
      </div>
    </Card>
  );
}

"use client";
import { NeonText } from "@/components/primitives/NeonText";
import { QuestsPanel } from "@/components/dashboard/QuestsPanel";

export default function QuestsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="mb-1 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)]">
          // QUESTS
        </div>
        <NeonText as="h1" className="text-4xl tracking-[-1px]">
          Sharpen your edge.
        </NeonText>
        <p className="mt-2 text-sm text-[var(--color-text-3)]">
          Daily quests rotate at local midnight. Weekly resets Monday.
        </p>
      </div>
      <QuestsPanel />
    </div>
  );
}

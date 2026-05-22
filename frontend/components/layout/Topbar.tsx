import { LiveIndicator } from "@/components/primitives/LiveIndicator";
import { UserPill } from "./UserPill";

export function Topbar({ onlineCount }: { onlineCount?: number }) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] px-8 py-4">
      <div className="flex w-[300px] items-center gap-2.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs text-[var(--color-text-3)] font-mono">
        <span>⌕</span>
        <span>Find a handle or problem…</span>
      </div>
      <div className="flex items-center gap-5">
        <LiveIndicator count={onlineCount} />
        <UserPill />
      </div>
    </header>
  );
}

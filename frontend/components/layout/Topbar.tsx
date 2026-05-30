import { LiveIndicator } from "@/components/primitives/LiveIndicator";
import { UserPill } from "./UserPill";
import { SearchBar } from "./SearchBar";

export function Topbar({ onlineCount }: { onlineCount?: number }) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] px-8 py-4">
      <SearchBar />
      <div className="flex items-center gap-5">
        <LiveIndicator count={onlineCount} />
        <UserPill />
      </div>
    </header>
  );
}

import { LiveIndicator } from "@/components/primitives/LiveIndicator";
import { UserPill } from "./UserPill";
import { SearchBar } from "./SearchBar";

export function Topbar({ onlineCount }: { onlineCount?: number }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 sm:px-8 py-3 sm:py-4">
      <SearchBar />
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden sm:block">
          <LiveIndicator count={onlineCount} />
        </div>
        <UserPill />
      </div>
    </header>
  );
}

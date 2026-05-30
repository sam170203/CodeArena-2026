"use client";
import { motion, AnimatePresence } from "framer-motion";

interface RecentEvent {
  ts: number;
  text: string;
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}

export function ActivityTicker({ events }: { events: RecentEvent[] }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
          // live activity
        </div>
        <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-ok-green)] uppercase flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok-green)]"
            style={{ boxShadow: "0 0 8px var(--color-ok-green)" }}
          />
          live
        </div>
      </div>

      {events.length === 0 ? (
        <div className="font-mono text-xs text-[var(--color-text-4)] py-2 text-center italic">
          waiting for the first move…
        </div>
      ) : (
        <ul className="space-y-1.5 max-h-[140px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {events.slice(0, 12).map((ev) => (
              <motion.li
                key={ev.ts}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-baseline justify-between gap-3 font-mono text-[11px]"
              >
                <span className="text-[var(--color-text-2)]">{ev.text}</span>
                <span className="shrink-0 text-[var(--color-text-4)] text-[10px] tracking-[0.1em]">
                  {timeAgo(ev.ts)}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

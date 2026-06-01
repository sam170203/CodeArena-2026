"use client";
import { cn } from "@/lib/cn";
import { VerdictPill } from "@/components/primitives/VerdictPill";
import type { ReplayResponse, ReplayEvent } from "@/types/replay";

function formatOffset(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  replay: ReplayResponse;
}

export function ReplayTimeline({ replay }: Props) {
  const host = replay.participants[0];
  const opp = replay.participants[1];
  if (!host) return null;

  // group events excluding duel_complete (rendered separately at the bottom)
  const events = replay.events.filter((e) => e.event_type !== "duel_complete");

  return (
    <div className="relative">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_60px_1fr] items-center gap-4 pb-4">
        <div className="text-right">
          <div className="font-display text-lg font-bold tracking-[-0.5px] text-[var(--color-text-1)]">
            {host.username}
          </div>
          <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-text-3)]">
            {host.tier} · ELO {host.elo}
          </div>
        </div>
        <div className="text-center font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
          vs
        </div>
        <div>
          <div className="font-display text-lg font-bold tracking-[-0.5px] text-[var(--color-text-1)]">
            {opp?.username ?? "—"}
          </div>
          <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-text-3)]">
            {opp ? `${opp.tier} · ELO ${opp.elo}` : "—"}
          </div>
        </div>
      </div>

      {/* Spine */}
      <div className="relative">
        <div
          className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(168,85,247,0.4) 8%, rgba(168,85,247,0.4) 92%, transparent)",
          }}
        />

        {/* Start marker */}
        <TimelineRow
          side="center"
          offset={0}
          content={
            <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-pink)] uppercase">
              // duel started
            </div>
          }
        />

        {events.map((ev, i) => {
          const side = ev.user_id === host.user_id ? "left" : "right";
          return (
            <TimelineRow
              key={`${ev.ts_offset_ms}-${i}`}
              side={side}
              offset={ev.ts_offset_ms}
              content={<EventCard event={ev} />}
            />
          );
        })}

        <TimelineRow
          side="center"
          offset={replay.duration_seconds * 1000}
          content={
            <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-pink)] uppercase">
              // duel ended
            </div>
          }
        />
      </div>
    </div>
  );
}

function TimelineRow({
  side,
  offset,
  content,
}: {
  side: "left" | "right" | "center";
  offset: number;
  content: React.ReactNode;
}) {
  if (side === "center") {
    return (
      <div className="grid grid-cols-[1fr_120px_1fr] items-center gap-3 py-4 relative">
        <div />
        <div className="text-center relative z-10 bg-[var(--color-bg-void)] px-3 py-1">
          <div className="font-mono text-[10px] text-[var(--color-text-3)] tracking-[0.15em]">
            {formatOffset(offset)}
          </div>
          <div className="mt-1">{content}</div>
        </div>
        <div />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-start gap-3 py-2 relative">
      <div className={cn(side === "left" ? "" : "invisible")}>
        <div className="flex flex-col items-end gap-1.5">{content}</div>
      </div>
      <div className="text-center relative z-10 bg-[var(--color-bg-void)] px-2 py-0.5">
        <div className="font-mono text-[10px] text-[var(--color-text-3)] tracking-[0.15em]">
          {formatOffset(offset)}
        </div>
        <span
          className="inline-block mt-1 h-2 w-2 rounded-full"
          style={{
            background: "var(--color-neon-violet)",
            boxShadow: "0 0 8px var(--color-neon-violet)",
          }}
        />
      </div>
      <div className={cn(side === "right" ? "" : "invisible")}>
        <div className="flex flex-col items-start gap-1.5">{content}</div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: ReplayEvent }) {
  if (event.event_type === "verdict") {
    const { verdict, testset, step_index } = event.payload;
    return (
      <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 inline-flex items-center gap-2.5">
        <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--color-text-3)]">
          step {step_index + 1}
        </span>
        <VerdictPill verdict={verdict} testset={testset} />
      </div>
    );
  }
  if (event.event_type === "step_advance") {
    return (
      <div className="rounded border border-[var(--color-ok-green)]/30 bg-[var(--color-ok-green)]/[0.08] px-3 py-2 inline-flex items-center gap-2">
        <span className="font-display text-xs font-extrabold tracking-[0.15em] text-[var(--color-ok-green)]">
          ADVANCED
        </span>
        <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--color-text-3)]">
          → step {event.payload.new_step_index + 1}
        </span>
      </div>
    );
  }
  return null;
}

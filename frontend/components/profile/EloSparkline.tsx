"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface HistoryRow {
  elo_before: number;
  elo_after: number;
  delta: number;
  result: string;
  created_at: string | null;
}

export function EloSparkline() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-elo-history"],
    queryFn: async () =>
      (await api.get<HistoryRow[]>("/profile/me/elo-history")).data,
  });

  if (isLoading) {
    return (
      <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">
        loading…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">
        Win a duel to start your ELO history.
      </div>
    );
  }

  const points = data.map((r) => r.elo_after);
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 1);
  const span = Math.max(1, max - min);
  const W = 600;
  const H = 140;
  const pad = 12;

  const coords = points
    .map((p, i) => {
      const x = pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
      const y = H - pad - ((p - min) / span) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[140px]">
        {/* tier band guides at 1300/1600/1900/2200 */}
        {[1000, 1300, 1600, 1900, 2200, 2500].map((band) => {
          if (band < min - 50 || band > max + 50) return null;
          const y = H - pad - ((band - min) / span) * (H - pad * 2);
          return (
            <g key={band}>
              <line
                x1={pad}
                x2={W - pad}
                y1={y}
                y2={y}
                stroke="rgba(168,85,247,0.12)"
                strokeDasharray="2 4"
              />
              <text
                x={W - pad - 2}
                y={y - 3}
                textAnchor="end"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fill="rgba(122,111,163,0.7)"
              >
                {band}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="elo-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        <polyline
          points={coords}
          fill="none"
          stroke="url(#elo-grad)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => {
          const x = pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
          const y = H - pad - ((p - min) / span) * (H - pad * 2);
          const result = data[i].result;
          const color =
            result === "win"
              ? "#34d399"
              : result === "loss"
              ? "#ef4444"
              : "#7a6fa3";
          return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
        })}
      </svg>
      <div className="mt-1 flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-3)]">
        <span>{points.length} duels</span>
        <span>
          {min} – {max}
        </span>
      </div>
    </div>
  );
}

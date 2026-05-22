"use client";
import { useEffect, useState } from "react";

export function DuelTimer({
  startedAt,
  capSeconds,
}: {
  startedAt: string;
  capSeconds: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const start = new Date(startedAt).getTime();
  const elapsed = Math.max(0, Math.floor((now - start) / 1000));
  const remaining = Math.max(0, capSeconds - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const capMM = String(Math.floor(capSeconds / 60)).padStart(2, "0");
  const capSS = String(capSeconds % 60).padStart(2, "0");
  return (
    <div className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-2)]">
      LIVE · {mm}:{ss} / {capMM}:{capSS}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";

export default function AdminMonitoringPage() {
  const [metrics, setMetrics] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<string>("/metrics", { responseType: "text" })
      .then((r) => setMetrics(r.data))
      .catch((e) => setError(e?.response?.data?.detail ?? "Failed to load metrics"));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-lg font-black tracking-[0.15em] text-white uppercase">
          System Monitoring
        </h1>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)] mt-1">
          Prometheus + Grafana — full observability stack
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="http://localhost:9090"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="p-5 space-y-2 transition hover:border-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/5">
            <div className="text-2xl text-[var(--color-neon-cyan)]" aria-hidden>■</div>
            <h3 className="font-mono text-xs tracking-[0.2em] text-[var(--color-text-1)] uppercase">
              Prometheus
            </h3>
            <p className="font-mono text-[11px] text-[var(--color-text-3)] leading-relaxed">
              Targets, alerts, and raw metric exploration at{" "}
              <code className="text-[var(--color-neon-pink)]">localhost:9090</code>.
            </p>
          </Card>
        </a>
        <a
          href="http://localhost:3001"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="p-5 space-y-2 transition hover:border-[var(--color-neon-pink)] hover:bg-[var(--color-neon-pink)]/5 border-[var(--color-border-hot)]">
            <div className="text-2xl text-[var(--color-neon-pink)]" aria-hidden>◈</div>
            <h3 className="font-mono text-xs tracking-[0.2em] text-[var(--color-text-1)] uppercase">
              Grafana
            </h3>
            <p className="font-mono text-[11px] text-[var(--color-text-3)] leading-relaxed">
              Pre-built dashboards at{" "}
              <code className="text-[var(--color-neon-pink)]">localhost:3001</code>{" "}
              (admin / admin). Includes API latency, error rates, active duels,
              queue size, WebSocket connections, per-user metrics, and DB query
              latency.
            </p>
          </Card>
        </a>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-xs tracking-[0.3em] text-[var(--color-text-3)] uppercase">
            Raw Metrics Output
          </h2>
          {metrics && (
            <span className="font-mono text-[10px] text-[var(--color-ok-green)]">
              {metrics.split("\n").filter((l) => l.startsWith("# HELP") || l.startsWith("# TYPE")).length} metric families
            </span>
          )}
        </div>
        {error && (
          <div className="font-mono text-xs text-[var(--color-fail-red)] mb-4">
            // {error}
          </div>
        )}
        <pre className="max-h-[400px] overflow-auto font-mono text-[10px] text-[var(--color-text-2)] bg-[var(--color-bg-void)] rounded-lg p-4 whitespace-pre-wrap break-all">
          {metrics || "// Waiting for metrics data…"}
        </pre>
      </Card>
    </div>
  );
}

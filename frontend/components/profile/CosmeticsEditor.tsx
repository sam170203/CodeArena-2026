"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/cn";

interface CosmeticItem {
  key: string;
  label: string;
  owned: boolean;
  css?: string;
  unlock?: string;
}

interface CosmeticsResponse {
  equipped: { banner: string; glyph: string };
  banners: CosmeticItem[];
  glyphs: CosmeticItem[];
}

export function CosmeticsEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-cosmetics"],
    queryFn: async () => (await api.get<CosmeticsResponse>("/cosmetics/me")).data,
  });
  const [saved, setSaved] = useState<string | null>(null);

  const equip = useMutation({
    mutationFn: async (body: { banner?: string; glyph?: string }) =>
      (await api.put<{ equipped: { banner: string; glyph: string } }>(
        "/cosmetics/equip",
        body
      )).data,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["my-cosmetics"] });
      setSaved(vars.banner ? "Banner equipped" : "Glyph equipped");
      setTimeout(() => setSaved(null), 1500);
    },
  });

  return (
    <Card>
      <div className="mb-2 font-mono text-[11px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
        Cosmetics
      </div>
      <p className="mb-4 text-xs text-[var(--color-text-3)]">
        Unlock new banners and avatar glyphs by climbing tiers. No power impact — pure flex.
      </p>
      {isLoading && (
        <div className="font-mono text-xs text-[var(--color-text-3)]">loading…</div>
      )}
      {data && (
        <>
          <div className="mb-2 font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            Banner
          </div>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {data.banners.map((b) => (
              <button
                key={b.key}
                disabled={!b.owned}
                onClick={() => equip.mutate({ banner: b.key })}
                className={cn(
                  "relative h-16 rounded-lg border p-2 text-left transition overflow-hidden",
                  data.equipped.banner === b.key
                    ? "border-[var(--color-border-hot)] ring-1 ring-[var(--color-neon-pink)]"
                    : b.owned
                    ? "border-[var(--color-border)] hover:border-[var(--color-border-hot)]"
                    : "border-[var(--color-border)] opacity-40 cursor-not-allowed"
                )}
                style={{ background: b.css }}
              >
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="font-mono text-[10px] tracking-[0.15em] text-white">
                    {b.label}
                  </div>
                  {!b.owned && (
                    <div className="font-mono text-[9px] tracking-[0.2em] text-white/80 uppercase">
                      {b.unlock}
                    </div>
                  )}
                  {data.equipped.banner === b.key && (
                    <div className="font-mono text-[9px] tracking-[0.25em] text-white">
                      ✓ EQUIPPED
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mb-2 font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
            Avatar glyph
          </div>
          <div className="grid grid-cols-6 gap-2">
            {data.glyphs.map((g) => (
              <button
                key={g.key}
                disabled={!g.owned}
                onClick={() => equip.mutate({ glyph: g.key })}
                className={cn(
                  "flex h-14 flex-col items-center justify-center rounded-lg border transition",
                  data.equipped.glyph === g.key
                    ? "border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/10 text-[var(--color-neon-pink)]"
                    : g.owned
                    ? "border-[var(--color-border)] text-[var(--color-text-2)] hover:border-[var(--color-border-hot)]"
                    : "border-[var(--color-border)] text-[var(--color-text-4)] opacity-60 cursor-not-allowed"
                )}
              >
                <span className="font-display text-xl font-black">{g.label}</span>
                {!g.owned && (
                  <span className="font-mono text-[8px] tracking-[0.2em] mt-0.5 text-[var(--color-text-3)]">
                    {g.unlock?.split(":")[1] ?? ""}
                  </span>
                )}
              </button>
            ))}
          </div>

          {saved && (
            <div className="mt-4 font-mono text-xs text-[var(--color-ok-green)]">
              ✓ {saved}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

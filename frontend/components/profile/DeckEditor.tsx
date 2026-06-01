"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/cn";

interface DeckResponse {
  tags: string[];
  available: string[];
}

export function DeckEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-deck"],
    queryFn: async () => (await api.get<DeckResponse>("/deck/me")).data,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.tags) setSelected(data.tags);
  }, [data?.tags]);

  const save = useMutation({
    mutationFn: async (tags: string[]) =>
      (await api.put<DeckResponse>("/deck/me", { tags })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-deck"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
  });

  function toggle(tag: string) {
    if (selected.includes(tag)) {
      setSelected(selected.filter((t) => t !== tag));
    } else if (selected.length < 3) {
      setSelected([...selected, tag]);
    }
  }

  return (
    <Card>
      <div className="mb-2 font-mono text-[11px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
        Algorithm deck
      </div>
      <p className="mb-4 text-xs text-[var(--color-text-3)]">
        Pick up to 3 tags. Matchmaking will favor problems matching the intersection of
        your deck and your opponent&apos;s.
      </p>
      {isLoading ? (
        <div className="font-mono text-xs text-[var(--color-text-3)]">loading…</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {data?.available.map((t) => {
              const on = selected.includes(t);
              const disabled = !on && selected.length >= 3;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  disabled={disabled}
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] transition",
                    on
                      ? "border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/10 text-[var(--color-neon-pink)]"
                      : disabled
                      ? "border-[var(--color-border)] text-[var(--color-text-4)] cursor-not-allowed"
                      : "border-[var(--color-border)] text-[var(--color-text-2)] hover:border-[var(--color-border-hot)] hover:text-[var(--color-text-1)]"
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button
              onClick={() => save.mutate(selected)}
              disabled={save.isPending}
            >
              {save.isPending ? "..." : "Save deck"}
            </Button>
            <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">
              {selected.length} / 3 selected
            </span>
            {saved && (
              <span className="font-mono text-xs text-[var(--color-ok-green)]">
                ✓ saved
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

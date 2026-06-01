"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    // Detect a Codeforces problem reference like "1925E" or "1925/E"
    const cfMatch = v.match(/^(\d{2,5})[\s/-]?([A-Z][0-9]?)$/i);
    if (cfMatch) {
      const contest = cfMatch[1];
      const idx = cfMatch[2].toUpperCase();
      window.open(
        `https://codeforces.com/contest/${contest}/problem/${idx}`,
        "_blank",
        "noopener,noreferrer"
      );
      setQ("");
      return;
    }
    // Otherwise treat as a CodeArena username → public profile route
    router.push(`/u/${encodeURIComponent(v)}`);
    setQ("");
  }

  return (
    <form
      onSubmit={submit}
      className={`flex w-full max-w-[300px] items-center gap-2 rounded border bg-[var(--color-surface)] px-3 transition ${
        focused
          ? "border-[var(--color-border-hot)] ring-1 ring-[var(--color-neon-pink)]/30"
          : "border-[var(--color-border)]"
      }`}
    >
      <span className="text-[var(--color-text-3)] text-sm">⌕</span>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Find a handle or problem… (try 1925E)"
        className="flex-1 bg-transparent py-2 font-mono text-xs text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] outline-none"
        autoComplete="off"
        spellCheck={false}
      />
      {q.length > 0 && (
        <button
          type="submit"
          className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-neon-cyan)] uppercase hover:text-[var(--color-text-1)]"
        >
          ↵
        </button>
      )}
    </form>
  );
}

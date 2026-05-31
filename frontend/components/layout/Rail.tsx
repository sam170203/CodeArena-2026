"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth";

function isMod(role?: string) {
  return role === "moderator" || role === "admin" || role === "superadmin";
}

const ITEMS = [
  { href: "/play", label: "Play", glyph: "⚡" },
  { href: "/leaderboard", label: "Leaderboard", glyph: "▲" },
  { href: "/quests", label: "Quests", glyph: "◆" },
  { href: "/profile", label: "Profile", glyph: "●" },
] as const;

export function Rail() {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);

  return (
    <nav className="flex flex-col items-center gap-3 border-r border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)]/60 to-[var(--color-bg-void)]/90 py-5 backdrop-blur-xl">
      <Link
        href="/play"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-neon-pink)] to-[var(--color-neon-violet)] font-display font-black text-white glow-pink"
      >
        ⚔
      </Link>
      {ITEMS.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg border transition",
              active
                ? "border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/10 text-[var(--color-neon-pink)]"
                : "border-transparent text-[var(--color-text-3)] hover:border-[var(--color-border)] hover:text-[var(--color-text-1)]"
            )}
          >
            <span aria-hidden>{item.glyph}</span>
          </Link>
        );
      })}

      {/* Admin link — only visible to moderators and above */}
      {user && isMod(user.role) && (
        <Link
          href="/admin"
          title="Admin"
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg border transition",
            pathname?.startsWith("/admin")
              ? "border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/10 text-[var(--color-neon-pink)]"
              : "border-transparent text-[var(--color-text-3)] hover:border-[var(--color-border)] hover:text-[var(--color-text-1)]"
          )}
        >
          <span aria-hidden>◈</span>
        </Link>
      )}

      <div className="flex-1" />
      <Link
        href="/profile/settings"
        title="Settings"
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-[var(--color-text-3)] hover:border-[var(--color-border)] hover:text-[var(--color-text-1)]"
      >
        ⚙
      </Link>
    </nav>
  );
}

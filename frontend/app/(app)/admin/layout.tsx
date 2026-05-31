"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", glyph: "◈" },
  { href: "/admin/users", label: "Users", glyph: "◎" },
  { href: "/admin/duels", label: "Duels", glyph: "⚔" },
  { href: "/admin/submissions", label: "Submissions", glyph: "▣" },
  { href: "/admin/rankings", label: "Rankings", glyph: "▲" },
  { href: "/admin/monitoring", label: "Monitoring", glyph: "■" },
];

function isMod(userRole?: string) {
  return userRole === "moderator" || userRole === "admin" || userRole === "superadmin";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated, hydrate } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !isMod(user.role)) {
      router.replace("/play");
      return;
    }
    setAuthorized(true);
  }, [hydrated, user, router]);

  if (!hydrated || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-xs tracking-[0.3em] text-[var(--color-text-3)]">
        // AUTHORIZING…
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <nav className="flex w-44 shrink-0 flex-col gap-1">
        <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-text-4)] uppercase mb-3">
          Admin
        </div>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-[12px] tracking-[0.1em] transition",
                active
                  ? "bg-[var(--color-neon-pink)]/10 text-[var(--color-neon-pink)] border border-[var(--color-border-hot)]"
                  : "text-[var(--color-text-3)] hover:text-[var(--color-text-1)] border border-transparent hover:border-[var(--color-border)]"
              )}
            >
              <span aria-hidden className="text-xs">{item.glyph}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

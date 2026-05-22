"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, hydrated, hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-xs tracking-[0.3em] text-[var(--color-text-3)]">
        // STAND BY…
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

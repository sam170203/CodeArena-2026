"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/stores/auth";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated, hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Only redirect from "/" to /play when logged in. /leaderboard stays accessible to everyone.
  useEffect(() => {
    if (hydrated && user && pathname === "/") router.replace("/play");
  }, [hydrated, user, router, pathname]);

  return <>{children}</>;
}

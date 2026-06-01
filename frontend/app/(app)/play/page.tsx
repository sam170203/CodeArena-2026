"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";
import { HeroBattleCard } from "@/components/dashboard/HeroBattleCard";
import { ProfileMicroCard } from "@/components/dashboard/ProfileMicroCard";
import { ModesGrid } from "@/components/dashboard/ModesGrid";
import { RecentDuelsPanel } from "@/components/dashboard/RecentDuelsPanel";
import { QuestsPanel } from "@/components/dashboard/QuestsPanel";
import { Card } from "@/components/primitives/Card";

export default function PlayPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  function onBattle() {
    if (!user?.cf_handle) {
      router.push("/profile/settings?from=play");
      return;
    }
    router.push("/play/queue");
  }

  return (
    <div className="space-y-8">
      {!user?.cf_handle && (
        <Card className="border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/[0.08]">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[11px] tracking-[0.25em] text-[var(--color-neon-pink)] mb-1">
                // CODEFORCES HANDLE REQUIRED
              </div>
              <div className="text-sm text-[var(--color-text-1)]">
                Link your handle to enter the arena.
              </div>
            </div>
            <Link
              href="/profile/settings"
              className="font-mono text-[12px] tracking-[0.2em] text-[var(--color-neon-cyan)] uppercase"
            >
              Link now →
            </Link>
          </div>
        </Card>
      )}

      <section className="grid grid-cols-[1fr_380px] gap-6">
        <HeroBattleCard onBattle={onBattle} />
        <ProfileMicroCard />
      </section>

      <section className="space-y-3.5">
        <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">
          // Choose your mode
        </div>
        <ModesGrid />
      </section>

      <section className="grid grid-cols-[1fr_360px] gap-6">
        <RecentDuelsPanel />
        <QuestsPanel compact />
      </section>
    </div>
  );
}

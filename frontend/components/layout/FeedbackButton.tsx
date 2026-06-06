"use client";
import Link from "next/link";

export function FeedbackButton() {
  return (
    <Link
      href="/feedback"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-br from-[var(--color-neon-violet)] to-[var(--color-neon-pink)] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[var(--color-neon-violet)]/30 transition hover:brightness-110 active:scale-95"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      Feedback
    </Link>
  );
}

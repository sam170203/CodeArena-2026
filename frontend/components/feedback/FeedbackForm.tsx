"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";

type Status = "idle" | "submitting" | "done" | "error";

const TYPES = ["🐛 Bug", "💡 Suggestion", "✨ Improvement", "💬 Other"];

export function FeedbackForm() {
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          description,
          email,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      if (!res.ok && res.status !== 429) throw new Error("failed");
      setStatus(res.status === 429 ? "error" : "done");
    } catch {
      setStatus("error");
    }
  }

  const inputCls =
    "w-full bg-white/[0.04] border border-[var(--color-border)] rounded-md text-[var(--color-text-1)] text-sm px-3 py-2.5 outline-none focus:border-[var(--color-neon-violet)]/60 focus:ring-1 focus:ring-[var(--color-neon-violet)]/20 transition placeholder:text-[var(--color-text-4)] font-[inherit]";

  const labelCls =
    "block text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-3)] mb-1.5";

  if (status === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-cyan)]">
          // RECEIVED
        </div>
        <p className="text-[var(--color-text-1)] text-lg font-semibold">
          Thanks for your feedback!
        </p>
        <p className="text-[var(--color-text-3)] text-sm max-w-xs">
          It goes straight to the team. We read every submission.
        </p>
        <button
          onClick={() => {
            setType("");
            setTitle("");
            setDescription("");
            setEmail("");
            setStatus("idle");
          }}
          className="mt-2 font-mono text-xs tracking-[0.1em] text-[var(--color-text-3)] hover:text-[var(--color-text-1)] transition"
        >
          Submit another →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className={labelCls}>
          Type{" "}
          <span className="text-[var(--color-text-4)] normal-case tracking-normal">
            optional
          </span>
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={cn(inputCls, "appearance-none cursor-pointer")}
        >
          <option value="">— pick one —</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>
          Title{" "}
          <span className="text-[var(--color-text-4)] normal-case tracking-normal">
            optional
          </span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary…"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>
          Description{" "}
          <span className="text-[var(--color-text-4)] normal-case tracking-normal">
            optional
          </span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us what happened, what you expected, or what you'd love to see…"
          rows={5}
          className={cn(inputCls, "resize-y")}
        />
      </div>

      <div>
        <label className={labelCls}>
          Your email{" "}
          <span className="text-[var(--color-text-4)] normal-case tracking-normal">
            optional — for follow-up
          </span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputCls}
        />
      </div>

      {status === "error" && (
        <p className="text-[var(--color-fail-red)] text-xs font-mono">
          // Too many submissions — try again later.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full py-3 font-display font-extrabold tracking-[0.2em] text-sm text-white uppercase rounded-md bg-gradient-to-br from-[var(--color-neon-violet)] to-[var(--color-neon-pink)] glow-violet hover:brightness-110 active:translate-y-[1px] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? "Sending…" : "Submit feedback →"}
      </button>

      <p className="text-center text-[10px] text-[var(--color-text-4)]">
        You can submit without filling anything in.
      </p>
    </form>
  );
}

"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";
import { TierBadge } from "@/components/cosmetic/TierBadge";
import { useAuth } from "@/stores/auth";

interface ChallengeUser {
  user_id: string;
  username: string;
  elo: number;
  tier: string;
}

interface AsyncChallengeRow {
  id: string;
  status: string;
  sender: ChallengeUser;
  recipient: ChallengeUser;
  problem_seed: {
    contest_id: number;
    index: string;
    name: string;
    rating: number;
    problem_id: string;
  }[];
  sender_steps_cleared: number;
  recipient_steps_cleared: number;
  sender_duration_s: number;
  recipient_duration_s: number;
  sender_finished_at: string | null;
  recipient_finished_at: string | null;
  winner_id: string | null;
  created_at: string | null;
}

interface InboxData {
  sent: AsyncChallengeRow[];
  received: AsyncChallengeRow[];
}

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function AsyncChallengePage() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const [recipient, setRecipient] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const inbox = useQuery({
    queryKey: ["async-inbox"],
    queryFn: async () => (await api.get<InboxData>("/async-challenge/inbox")).data,
    refetchInterval: 10000,
  });

  const create = useMutation({
    mutationFn: async (username: string) =>
      (await api.post("/async-challenge", { recipient_username: username })).data,
    onSuccess: () => {
      setRecipient("");
      qc.invalidateQueries({ queryKey: ["async-inbox"] });
    },
    onError: (e) => {
      const ax = e as { response?: { data?: { detail?: string } } };
      setErr(ax.response?.data?.detail ?? "Failed to send challenge");
    },
  });

  const accept = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/async-challenge/${id}/accept`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["async-inbox"] }),
  });

  const submit = useMutation({
    mutationFn: async (vars: { id: string; cleared: number; duration: number }) =>
      (await api.post(`/async-challenge/${vars.id}/submit`, {
        steps_cleared: vars.cleared,
        duration_s: vars.duration,
      })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["async-inbox"] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-1 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)]">
          // ASYNC CHALLENGE
        </div>
        <NeonText as="h1" className="text-4xl tracking-[-1px]">
          Across time zones.
        </NeonText>
        <p className="mt-2 text-sm text-[var(--color-text-3)]">
          Send a friend a 5-problem ladder. They have 24h to play. Results compared when both finish.
        </p>
      </div>

      <Card>
        <div className="mb-3 font-mono text-[11px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">
          Send a challenge
        </div>
        <div className="flex gap-3">
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="recipient username"
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-sm text-[var(--color-text-1)] outline-none focus:border-[var(--color-border-hot)]"
          />
          <Button
            onClick={() => {
              setErr(null);
              if (recipient.trim()) create.mutate(recipient.trim());
            }}
            disabled={create.isPending || !recipient.trim()}
          >
            {create.isPending ? "..." : "Send"}
          </Button>
        </div>
        {err && (
          <div className="mt-3 font-mono text-xs text-[var(--color-fail-red)]">{err}</div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">
            Received
          </div>
          <span className="font-mono text-[11px] text-[var(--color-text-3)] tracking-[0.2em] uppercase">
            {inbox.data?.received.length ?? 0}
          </span>
        </div>
        {inbox.data && inbox.data.received.length === 0 && (
          <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">
            No incoming challenges.
          </div>
        )}
        {inbox.data?.received.map((c) => (
          <ChallengeRow
            key={c.id}
            challenge={c}
            myId={me?.id}
            isReceiver
            onAccept={() => accept.mutate(c.id)}
            onSubmit={(cleared, duration) =>
              submit.mutate({ id: c.id, cleared, duration })
            }
          />
        ))}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">
            Sent
          </div>
          <span className="font-mono text-[11px] text-[var(--color-text-3)] tracking-[0.2em] uppercase">
            {inbox.data?.sent.length ?? 0}
          </span>
        </div>
        {inbox.data && inbox.data.sent.length === 0 && (
          <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">
            No challenges sent yet.
          </div>
        )}
        {inbox.data?.sent.map((c) => (
          <ChallengeRow
            key={c.id}
            challenge={c}
            myId={me?.id}
            onSubmit={(cleared, duration) =>
              submit.mutate({ id: c.id, cleared, duration })
            }
          />
        ))}
      </Card>
    </div>
  );
}

function ChallengeRow({
  challenge,
  myId,
  isReceiver = false,
  onAccept,
  onSubmit,
}: {
  challenge: AsyncChallengeRow;
  myId?: string;
  isReceiver?: boolean;
  onAccept?: () => void;
  onSubmit: (cleared: number, duration: number) => void;
}) {
  const [cleared, setCleared] = useState("0");
  const [duration, setDuration] = useState("");
  const opp = isReceiver ? challenge.sender : challenge.recipient;
  const myFinished = isReceiver
    ? challenge.recipient_finished_at
    : challenge.sender_finished_at;
  const isWin = challenge.winner_id === myId;

  return (
    <div className="border-b border-[var(--color-border)] py-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <TierBadge elo={opp.elo} size="sm" showDivision={false} />
        <div className="flex-1">
          <div className="font-semibold text-sm text-[var(--color-text-1)]">
            {isReceiver ? "from" : "to"} {opp.username}
          </div>
          <div className="font-mono text-[10px] tracking-[0.15em] text-[var(--color-text-3)] uppercase">
            {opp.tier} · ELO {opp.elo} · status: {challenge.status}
          </div>
        </div>
        {challenge.winner_id && (
          <span
            className={`font-display text-xs font-extrabold tracking-[0.15em] ${
              isWin
                ? "text-[var(--color-ok-green)]"
                : "text-[var(--color-fail-red)]"
            }`}
          >
            {isWin ? "WIN" : "LOSS"}
          </span>
        )}
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {challenge.problem_seed.map((p) => (
          <a
            key={p.problem_id}
            href={`https://codeforces.com/contest/${p.contest_id}/problem/${p.index}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-[var(--color-border)] py-1.5 text-center font-mono text-[10px] text-[var(--color-text-3)] hover:text-[var(--color-text-1)] hover:border-[var(--color-border-hot)]"
          >
            {p.rating}
          </a>
        ))}
      </div>

      {/* Action area */}
      {challenge.status === "complete" ? (
        <div className="mt-3 grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">
              You
            </div>
            <div className="font-mono text-sm text-[var(--color-text-1)]">
              {isReceiver
                ? `${challenge.recipient_steps_cleared}/5 · ${fmtDur(
                    challenge.recipient_duration_s
                  )}`
                : `${challenge.sender_steps_cleared}/5 · ${fmtDur(
                    challenge.sender_duration_s
                  )}`}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">
              {opp.username}
            </div>
            <div className="font-mono text-sm text-[var(--color-text-1)]">
              {isReceiver
                ? `${challenge.sender_steps_cleared}/5 · ${fmtDur(
                    challenge.sender_duration_s
                  )}`
                : `${challenge.recipient_steps_cleared}/5 · ${fmtDur(
                    challenge.recipient_duration_s
                  )}`}
            </div>
          </div>
        </div>
      ) : myFinished ? (
        <div className="mt-3 font-mono text-xs text-[var(--color-text-3)]">
          Waiting for opponent…
        </div>
      ) : isReceiver && challenge.status === "sent" ? (
        <div className="mt-3">
          <Button onClick={onAccept}>Accept &amp; start attempt</Button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={5}
            value={cleared}
            onChange={(e) => setCleared(e.target.value)}
            placeholder="steps cleared (0-5)"
            className="w-32 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 font-mono text-xs text-[var(--color-text-1)] outline-none focus:border-[var(--color-border-hot)]"
          />
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="duration (s)"
            className="w-32 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 font-mono text-xs text-[var(--color-text-1)] outline-none focus:border-[var(--color-border-hot)]"
          />
          <Button
            size="md"
            onClick={() => onSubmit(Number(cleared || 0), Number(duration || 0))}
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}

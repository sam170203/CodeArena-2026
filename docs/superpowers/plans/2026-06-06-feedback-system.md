# Feedback System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating feedback button (on every app page) and a `/feedback` page where users can report bugs, suggestions, or improvements — all fields optional, delivered to `aryan.pareek@quarq.io` via Resend.

**Architecture:** Next.js API route (`/api/feedback`) calls Resend SDK to send email. A `FeedbackForm` client component handles the form state. A floating `FeedbackButton` in the `(app)` layout links to `/feedback`. The `/feedback` page lives in `(marketing)` (no auth required).

**Tech Stack:** Next.js 16 App Router, React 19, Resend SDK (`resend`), Vitest + Testing Library, Tailwind CSS v4

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `frontend/lib/feedback-email.ts` | Format email subject + HTML body |
| Create | `frontend/tests/lib/feedback-email.test.ts` | Unit tests for email formatter |
| Create | `frontend/app/api/feedback/route.ts` | POST handler — rate limit, call Resend |
| Create | `frontend/components/feedback/FeedbackForm.tsx` | Client form — all fields optional, success state |
| Create | `frontend/components/layout/FeedbackButton.tsx` | Fixed floating pill button |
| Create | `frontend/app/(marketing)/feedback/page.tsx` | `/feedback` page — renders FeedbackForm |
| Modify | `frontend/app/(app)/layout.tsx` | Import + render `<FeedbackButton />` |

---

## Task 1: Install resend package

**Files:** `frontend/package.json`, `frontend/package-lock.json`

- [ ] **Step 1: Install the package**

```bash
cd frontend && npm install resend
```

Expected output: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Verify import resolves**

```bash
node -e "require('resend'); console.log('ok')"
```

Expected: `ok`

---

## Task 2: Email formatter + tests (TDD)

**Files:**
- Create: `frontend/lib/feedback-email.ts`
- Create: `frontend/tests/lib/feedback-email.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/tests/lib/feedback-email.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatSubject, formatBody } from "@/lib/feedback-email";

describe("formatSubject", () => {
  it("uses type and title when both provided", () => {
    expect(formatSubject("Bug", "Login broken")).toBe(
      "[Code Arena Feedback] Bug — Login broken"
    );
  });
  it("falls back to General when no type", () => {
    expect(formatSubject("", "Login broken")).toBe(
      "[Code Arena Feedback] General — Login broken"
    );
  });
  it("falls back to No title when no title", () => {
    expect(formatSubject("Bug", "")).toBe(
      "[Code Arena Feedback] Bug — No title"
    );
  });
  it("handles both empty", () => {
    expect(formatSubject("", "")).toBe(
      "[Code Arena Feedback] General — No title"
    );
  });
});

describe("formatBody", () => {
  it("includes all provided fields", () => {
    const html = formatBody({
      type: "Bug",
      title: "Login broken",
      description: "Cannot log in",
      email: "user@example.com",
      pageUrl: "https://app.com/play",
    });
    expect(html).toContain("Bug");
    expect(html).toContain("Login broken");
    expect(html).toContain("Cannot log in");
    expect(html).toContain("user@example.com");
    expect(html).toContain("https://app.com/play");
  });

  it("renders gracefully with all fields empty", () => {
    const html = formatBody({
      type: "",
      title: "",
      description: "",
      email: "",
      pageUrl: "",
    });
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- feedback-email
```

Expected: FAIL — `Cannot find module '@/lib/feedback-email'`

- [ ] **Step 3: Create the email formatter**

Create `frontend/lib/feedback-email.ts`:

```typescript
export interface FeedbackPayload {
  type: string;
  title: string;
  description: string;
  email: string;
  pageUrl: string;
}

export function formatSubject(type: string, title: string): string {
  const t = type.trim() || "General";
  const ti = title.trim() || "No title";
  return `[Code Arena Feedback] ${t} — ${ti}`;
}

export function formatBody(payload: FeedbackPayload): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 12px;color:#7a6fa3;font-size:12px;white-space:nowrap">${label}</td><td style="padding:8px 12px;color:#f5f0ff;font-size:14px">${value || '<span style="color:#443c66">—</span>'}</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#07020f;margin:0;padding:32px;font-family:system-ui,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#1a0a35;border:1px solid rgba(168,85,247,0.22);border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#a855f7,#ec4899);padding:20px 24px">
      <div style="font-size:10px;letter-spacing:0.3em;color:rgba(255,255,255,0.7);margin-bottom:4px">// CODE ARENA</div>
      <div style="font-size:18px;font-weight:700;color:#fff">New Feedback Received</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${row("Type", payload.type)}
      ${row("Title", payload.title)}
      ${row("Description", payload.description.replace(/\n/g, "<br>"))}
      ${row("Email", payload.email)}
      ${row("Page", payload.pageUrl)}
    </table>
    <div style="padding:12px 24px 20px;font-size:11px;color:#443c66">
      Sent at ${new Date().toUTCString()}
    </div>
  </div>
</body>
</html>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- feedback-email
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/feedback-email.ts frontend/tests/lib/feedback-email.test.ts
git commit -m "feat: add feedback email formatter with tests"
```

---

## Task 3: API route

**Files:**
- Create: `frontend/app/api/feedback/route.ts`

- [ ] **Step 1: Create the route handler**

Create `frontend/app/api/feedback/route.ts`:

```typescript
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { formatSubject, formatBody, FeedbackPayload } from "@/lib/feedback-email";

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory rate limit: 5 submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      { status: 429 }
    );
  }

  let body: Partial<FeedbackPayload> = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const payload: FeedbackPayload = {
    type: (body.type ?? "").trim(),
    title: (body.title ?? "").trim(),
    description: (body.description ?? "").trim(),
    email: (body.email ?? "").trim(),
    pageUrl: (body.pageUrl ?? "").trim(),
  };

  await resend.emails.send({
    from: "Code Arena <onboarding@resend.dev>",
    to: "aryan.pareek@quarq.io",
    subject: formatSubject(payload.type, payload.title),
    html: formatBody(payload),
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/feedback/route.ts
git commit -m "feat: add /api/feedback POST route with Resend + rate limiting"
```

---

## Task 4: FeedbackForm component

**Files:**
- Create: `frontend/components/feedback/FeedbackForm.tsx`

- [ ] **Step 1: Create the form component**

Create `frontend/components/feedback/FeedbackForm.tsx`:

```tsx
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
            setType(""); setTitle(""); setDescription(""); setEmail(""); setStatus("idle");
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
      {/* Type */}
      <div>
        <label className={labelCls}>
          Type <span className="text-[var(--color-text-4)] normal-case tracking-normal">optional</span>
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={cn(inputCls, "appearance-none cursor-pointer")}
        >
          <option value="">— pick one —</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className={labelCls}>
          Title <span className="text-[var(--color-text-4)] normal-case tracking-normal">optional</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary…"
          className={inputCls}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>
          Description <span className="text-[var(--color-text-4)] normal-case tracking-normal">optional</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us what happened, what you expected, or what you'd love to see…"
          rows={5}
          className={cn(inputCls, "resize-y")}
        />
      </div>

      {/* Email */}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/feedback/FeedbackForm.tsx
git commit -m "feat: add FeedbackForm component"
```

---

## Task 5: /feedback page

**Files:**
- Create: `frontend/app/(marketing)/feedback/page.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/app/(marketing)/feedback/page.tsx`:

```tsx
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export const metadata = {
  title: "Feedback — Code Arena",
  description: "Report a bug, suggest a feature, or share an idea.",
};

export default function FeedbackPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-2 font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-pink)]">
        // FEEDBACK
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--color-text-1)]">
        Send Feedback
      </h1>
      <p className="mb-10 text-sm text-[var(--color-text-3)]">
        Bug, suggestion, or idea — anything helps. All fields are optional.
      </p>
      <FeedbackForm />
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/\(marketing\)/feedback/page.tsx
git commit -m "feat: add /feedback page"
```

---

## Task 6: FeedbackButton floating component

**Files:**
- Create: `frontend/components/layout/FeedbackButton.tsx`

- [ ] **Step 1: Create the floating button**

Create `frontend/components/layout/FeedbackButton.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/layout/FeedbackButton.tsx
git commit -m "feat: add FeedbackButton floating component"
```

---

## Task 7: Wire FeedbackButton into app layout

**Files:**
- Modify: `frontend/app/(app)/layout.tsx`

- [ ] **Step 1: Add FeedbackButton to the layout**

Edit `frontend/app/(app)/layout.tsx`. Add the import and render `<FeedbackButton />` just before the closing `</AppShell>` tag. The final file should look like:

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";
import { AppShell } from "@/components/layout/AppShell";
import { FeedbackButton } from "@/components/layout/FeedbackButton";

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

  return (
    <AppShell>
      {children}
      <FeedbackButton />
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run full test suite**

```bash
cd frontend && npm test
```

Expected: All tests pass including the new `feedback-email` tests.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/\(app\)/layout.tsx
git commit -m "feat: wire FeedbackButton into app layout"
```

---

## Task 8: Environment variable + push

**Files:** `.env.local` (local only), Vercel project env vars

- [ ] **Step 1: Create a Resend account and API key**

Go to [resend.com](https://resend.com) → sign up → API Keys → Create API Key. Copy the key (starts with `re_`).

- [ ] **Step 2: Add to local .env.local**

```bash
echo "RESEND_API_KEY=re_YOUR_KEY_HERE" >> frontend/.env.local
```

Verify `.env.local` is in `.gitignore` (it should be by default with Next.js).

- [ ] **Step 3: Verify .env.local is gitignored**

```bash
git check-ignore frontend/.env.local
```

Expected: `frontend/.env.local` printed (meaning it IS ignored).

- [ ] **Step 4: Push to GitHub**

```bash
git push origin feat/db-layer
```

- [ ] **Step 5: Add env var to Vercel**

In Vercel dashboard → Project Settings → Environment Variables → add `RESEND_API_KEY` with the value from Step 1. Set for Production + Preview environments. Redeploy.

> **Note:** Until `RESEND_API_KEY` is set, the API route will throw. The form will show the error state ("Too many submissions — try again later.") — this is acceptable during local dev without the key.

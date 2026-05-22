# CodeArena Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the core ranked duel loop end-to-end: Next 16 App Router + TypeScript frontend with Arcade Neon visual system, working Quick Match matchmaking, live duel HUD driven by a Codeforces verdict poller, win/lose ceremony, and basic ELO updates.

**Architecture:**
Frontend rebuild inside `CodeArena-2026/frontend/` migrating Pages→App Router and JS→TS. Backend extends existing FastAPI with three async background services (matchmaker, CF verdict poller, optional notifier), new tables (`DuelStep`, `MatchmakingQueueEntry`, `EloHistory`), and extended WebSocket events. Players never type code in our app — they submit on Codeforces and we poll `/api/user.status` to detect verdicts.

**Tech Stack:** Next 16 (App Router) · TypeScript · Tailwind v4 · Zustand · TanStack Query · framer-motion · native WebSocket · FastAPI · SQLAlchemy · SQLite · Alembic · pytest · Vitest.

**Spec reference:** `docs/superpowers/specs/2026-05-22-codeforces-duel-arcade-design.md`

---

## File map (created/modified in this plan)

**Frontend (`frontend/`):**
- New: `tsconfig.json`, `next.config.ts`
- New: `app/layout.tsx`, `app/globals.css`, `app/providers.tsx`
- New: `app/(marketing)/page.tsx`, `app/(marketing)/leaderboard/page.tsx`
- New: `app/(app)/layout.tsx`, `app/(app)/play/page.tsx`, `app/(app)/play/queue/page.tsx`
- New: `app/(app)/duel/[id]/page.tsx`, `app/(app)/profile/page.tsx`, `app/(app)/profile/settings/page.tsx`
- New: `app/login/page.tsx`, `app/register/page.tsx`
- New: `components/primitives/{Button,Card,NeonText,StatTile,VerdictPill,LiveIndicator,ScanlineOverlay}.tsx`
- New: `components/layout/{AppShell,Rail,Topbar,UserPill}.tsx`
- New: `components/arena/{LadderRail,OpponentPanel,ProblemCard,DuelTimer,VictoryOverlay,ArenaEntrance,NumberTicker}.tsx`
- New: `lib/{api.ts,ws.ts,cf.ts,elo.ts,tier.ts,auth.ts,fonts.ts}`
- New: `stores/{auth.ts,duel.ts,queue.ts}`
- New: `types/{user.ts,duel.ts,ws.ts,cf.ts}`
- New: `tests/lib/{elo.test.ts,tier.test.ts}` (Vitest)
- Delete: `frontend/pages/`, `frontend/jsconfig.json`, `frontend/lib/api.js`, `frontend/store/authStore.js`, `frontend/components/{Layout,Navbar}.jsx`, `frontend/styles/globals.css`

**Backend (`backend/`):**
- Modify: `app/models.py` (new tables + User/Duel columns)
- Modify: `app/schemas.py` (new request/response models)
- Modify: `app/main.py` (mount new routers, start background services)
- Modify: `app/api/routes/duel.py` (extend for speedrun_ladder format)
- New: `app/api/routes/matchmaking.py`
- New: `app/api/routes/leaderboard.py`
- New: `app/api/routes/cf.py` (handle validation endpoint)
- New: `app/services/matchmaker.py`
- New: `app/services/cf_poller.py`
- New: `app/services/problem_picker.py`
- New: `app/services/duel_completion.py`
- New: `app/services/elo.py`
- New: `app/services/ws_hub.py` (centralised WS subscription registry for queue + duel + user channels)
- New: `tests/services/{test_elo.py,test_problem_picker.py,test_matchmaker.py,test_cf_poller.py}` (pytest)
- New: `alembic/versions/<rev>_phase1_tables.py` (migration)

---

## Task 1: Frontend scaffold — App Router + TypeScript migration

**Files:**
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/app/globals.css`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/providers.tsx`
- Create: `frontend/lib/fonts.ts`
- Create: `frontend/.env.local`
- Modify: `frontend/package.json`
- Delete: `frontend/pages/`, `frontend/jsconfig.json`, `frontend/components/`, `frontend/store/`, `frontend/lib/`, `frontend/styles/`

- [ ] **Step 1.1: Install TypeScript + new deps**

```bash
cd frontend
npm install --save @tanstack/react-query @tanstack/react-query-devtools framer-motion clsx
npm install --save-dev typescript @types/react @types/react-dom @types/node vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

Expected: `package.json` updated, `node_modules/` populated.

- [ ] **Step 1.2: Write `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 1.3: Replace `frontend/next.config.mjs` with `frontend/next.config.ts`**

Delete `next.config.mjs`. Create `frontend/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
};

export default nextConfig;
```

- [ ] **Step 1.4: Create `frontend/.env.local`**

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

- [ ] **Step 1.5: Wipe legacy frontend folders**

```bash
cd frontend
rm -rf pages jsconfig.json components store lib styles
```

- [ ] **Step 1.6: Create `frontend/lib/fonts.ts`**

```ts
import { Orbitron, Inter, JetBrains_Mono } from "next/font/google";

export const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});
```

- [ ] **Step 1.7: Create `frontend/app/globals.css` with design tokens**

```css
@import "tailwindcss";

@theme {
  --color-bg-void: #07020f;
  --color-bg-haze: #0e0425;
  --color-surface: #1a0a35;
  --color-surface-2: #251355;
  --color-border: rgba(168, 85, 247, 0.22);
  --color-border-hot: rgba(236, 72, 153, 0.5);
  --color-neon-pink: #ec4899;
  --color-neon-cyan: #22d3ee;
  --color-neon-violet: #a855f7;
  --color-neon-gold: #fbbf24;
  --color-ok-green: #34d399;
  --color-fail-red: #ef4444;
  --color-text-1: #f5f0ff;
  --color-text-2: #c4b8e0;
  --color-text-3: #7a6fa3;
  --color-text-4: #443c66;
}

@layer base {
  :root {
    color-scheme: dark;
  }
  html, body {
    background: var(--color-bg-void);
    color: var(--color-text-2);
    font-family: var(--font-inter), system-ui, sans-serif;
    min-height: 100vh;
  }
  body {
    background-image:
      radial-gradient(ellipse at 20% 0%, rgba(168, 85, 247, 0.14), transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(236, 72, 153, 0.10), transparent 50%);
    background-attachment: fixed;
  }
  ::selection { background: var(--color-neon-pink); color: var(--color-bg-void); }
}

@layer utilities {
  .font-display { font-family: var(--font-orbitron), sans-serif; }
  .font-mono { font-family: var(--font-jetbrains), ui-monospace, monospace; }
  .text-gradient-pink {
    background: linear-gradient(180deg, #fff, var(--color-neon-pink) 75%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .glow-pink { box-shadow: 0 0 24px rgba(236, 72, 153, 0.45); }
  .glow-cyan { box-shadow: 0 0 24px rgba(34, 211, 238, 0.45); }
  .glow-violet { box-shadow: 0 0 24px rgba(168, 85, 247, 0.45); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 1.8: Create `frontend/app/providers.tsx`**

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 1.9: Create `frontend/app/layout.tsx`**

```tsx
import "./globals.css";
import { Metadata } from "next";
import { orbitron, inter, jetbrains } from "@/lib/fonts";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CodeArena · enter the arena",
  description: "Real-time Codeforces duels. First to clear the ladder wins.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
```

- [ ] **Step 1.10: Smoke test — `npm run dev` and open `http://localhost:3000`**

Expected: blank dark page with violet gradient haze, no crashes. (Routes 404 — that's expected; we add `/` next.)

---

## Task 2: Core primitives (`components/primitives/`)

**Files:**
- Create: `frontend/components/primitives/Button.tsx`
- Create: `frontend/components/primitives/Card.tsx`
- Create: `frontend/components/primitives/NeonText.tsx`
- Create: `frontend/components/primitives/StatTile.tsx`
- Create: `frontend/components/primitives/VerdictPill.tsx`
- Create: `frontend/components/primitives/LiveIndicator.tsx`
- Create: `frontend/components/primitives/ScanlineOverlay.tsx`
- Create: `frontend/lib/cn.ts`

- [ ] **Step 2.1: Create `frontend/lib/cn.ts`**

```ts
import clsx, { ClassValue } from "clsx";
export const cn = (...args: ClassValue[]) => clsx(args);
```

- [ ] **Step 2.2: Create `frontend/components/primitives/Button.tsx`**

```tsx
"use client";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "font-display font-extrabold tracking-[0.2em] text-white bg-gradient-to-br from-[var(--color-neon-pink)] to-[var(--color-neon-violet)] glow-pink hover:brightness-110 active:translate-y-[1px]",
  secondary:
    "font-mono font-bold tracking-[0.15em] text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/10",
  ghost:
    "font-mono font-bold tracking-[0.15em] text-[var(--color-text-2)] border border-[var(--color-border)] hover:border-[var(--color-border-hot)] hover:text-[var(--color-text-1)]",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2.5 text-xs rounded",
  lg: "px-8 py-4 text-sm rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", ...rest }, ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center uppercase transition disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant], sizes[size], className
      )}
      {...rest}
    />
  );
});
```

- [ ] **Step 2.3: Create `frontend/components/primitives/Card.tsx`**

```tsx
import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6",
          className
        )}
        {...rest}
      />
    );
  }
);
```

- [ ] **Step 2.4: Create `frontend/components/primitives/NeonText.tsx`**

```tsx
import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  as?: "h1" | "h2" | "h3" | "span" | "div";
  tone?: "pink" | "cyan" | "violet" | "gold";
}

export function NeonText({ as: Tag = "span", tone = "pink", className, children, ...rest }: Props) {
  const grad =
    tone === "pink"   ? "linear-gradient(180deg,#fff,#ec4899 75%)" :
    tone === "cyan"   ? "linear-gradient(180deg,#fff,#22d3ee 75%)" :
    tone === "violet" ? "linear-gradient(180deg,#fff,#a855f7 75%)" :
                        "linear-gradient(180deg,#fff,#fbbf24 75%)";
  return (
    <Tag
      className={cn("font-display font-black", className)}
      style={{ background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 2.5: Create `frontend/components/primitives/StatTile.tsx`**

```tsx
import { cn } from "@/lib/cn";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  className?: string;
}

export function StatTile({ label, value, delta, deltaTone = "neutral", className }: Props) {
  const deltaColor =
    deltaTone === "up" ? "text-[var(--color-ok-green)]" :
    deltaTone === "down" ? "text-[var(--color-fail-red)]" :
                            "text-[var(--color-text-3)]";
  return (
    <div className={cn("rounded-xl border border-[var(--color-border)] bg-[var(--color-neon-violet)]/[0.06] p-4", className)}>
      <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] uppercase">{label}</div>
      <div className="font-mono font-bold text-[28px] leading-none text-[var(--color-text-1)] mt-1">{value}</div>
      {delta && <div className={cn("font-mono text-[11px] mt-1", deltaColor)}>{delta}</div>}
    </div>
  );
}
```

- [ ] **Step 2.6: Create `frontend/components/primitives/VerdictPill.tsx`**

```tsx
import { cn } from "@/lib/cn";

export type Verdict = "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "RUNNING" | "PENDING";

const cls: Record<Verdict, string> = {
  AC:      "text-[var(--color-ok-green)] border-[var(--color-ok-green)]/40 bg-[var(--color-ok-green)]/10",
  WA:      "text-[var(--color-fail-red)] border-[var(--color-fail-red)]/40 bg-[var(--color-fail-red)]/10",
  TLE:     "text-[var(--color-neon-gold)] border-[var(--color-neon-gold)]/40 bg-[var(--color-neon-gold)]/10",
  MLE:     "text-[var(--color-neon-gold)] border-[var(--color-neon-gold)]/40 bg-[var(--color-neon-gold)]/10",
  RE:      "text-[var(--color-fail-red)] border-[var(--color-fail-red)]/40 bg-[var(--color-fail-red)]/10",
  CE:      "text-[var(--color-fail-red)] border-[var(--color-fail-red)]/40 bg-[var(--color-fail-red)]/10",
  RUNNING: "text-[var(--color-neon-cyan)] border-[var(--color-neon-cyan)]/40 bg-[var(--color-neon-cyan)]/10",
  PENDING: "text-[var(--color-text-2)] border-[var(--color-border)] bg-[var(--color-surface-2)]/40",
};

export function VerdictPill({ verdict, testset, className }: { verdict: Verdict; testset?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono font-bold text-[11px] tracking-[0.1em] px-2.5 py-1 rounded border", cls[verdict], className)}>
      {verdict}
      {testset != null && verdict !== "AC" && <span className="opacity-70">· t{testset}</span>}
    </span>
  );
}
```

- [ ] **Step 2.7: Create `frontend/components/primitives/LiveIndicator.tsx`**

```tsx
import { cn } from "@/lib/cn";

export function LiveIndicator({ count, className }: { count?: number | string; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] text-[var(--color-ok-green)]", className)}>
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-ok-green)]" style={{ boxShadow: "0 0 12px var(--color-ok-green)" }}>
        <span className="absolute inset-0 rounded-full bg-[var(--color-ok-green)] opacity-60 animate-ping" />
      </span>
      <span>LIVE{count != null ? ` · ${count} IN ARENAS` : ""}</span>
    </div>
  );
}
```

- [ ] **Step 2.8: Create `frontend/components/primitives/ScanlineOverlay.tsx`**

```tsx
export function ScanlineOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] mix-blend-overlay opacity-30"
      style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.025) 3px 4px)",
      }}
    />
  );
}
```

---

## Task 3: Layout shell — rail, topbar, app shell

**Files:**
- Create: `frontend/components/layout/Rail.tsx`
- Create: `frontend/components/layout/Topbar.tsx`
- Create: `frontend/components/layout/UserPill.tsx`
- Create: `frontend/components/layout/AppShell.tsx`
- Create: `frontend/app/(app)/layout.tsx`

- [ ] **Step 3.1: Create `frontend/components/layout/Rail.tsx`**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/play",        label: "Play",        glyph: "⚡" },
  { href: "/leaderboard", label: "Leaderboard", glyph: "▲" },
  { href: "/quests",      label: "Quests",      glyph: "◆" },
  { href: "/profile",     label: "Profile",     glyph: "●" },
] as const;

export function Rail() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col items-center gap-3 border-r border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)]/60 to-[var(--color-bg-void)]/90 py-5 backdrop-blur-xl">
      <Link href="/play" className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-neon-pink)] to-[var(--color-neon-violet)] font-display font-black text-white glow-pink">⚔</Link>
      {ITEMS.map(item => {
        const active = pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} title={item.label}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg border transition",
              active
                ? "border-[var(--color-border-hot)] bg-[var(--color-neon-pink)]/10 text-[var(--color-neon-pink)]"
                : "border-transparent text-[var(--color-text-3)] hover:border-[var(--color-border)] hover:text-[var(--color-text-1)]"
            )}>
            <span aria-hidden>{item.glyph}</span>
          </Link>
        );
      })}
      <div className="flex-1" />
      <Link href="/profile/settings" title="Settings" className="flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-[var(--color-text-3)] hover:border-[var(--color-border)]">⚙</Link>
    </nav>
  );
}
```

- [ ] **Step 3.2: Create `frontend/components/layout/UserPill.tsx`**

```tsx
"use client";
import Link from "next/link";
import { useAuth } from "@/stores/auth";

export function UserPill() {
  const user = useAuth(s => s.user);
  if (!user) return null;
  const letter = user.username.charAt(0).toUpperCase();
  return (
    <Link href="/profile" className="flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-1.5 pr-3 hover:border-[var(--color-border-hot)]">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-neon-violet)] to-[var(--color-neon-pink)] font-display font-extrabold text-xs text-white">{letter}</span>
      <span className="font-semibold text-[13px] text-[var(--color-text-1)]">{user.username}</span>
      <span className="font-mono text-[11px] text-[var(--color-neon-cyan)]">ELO {user.elo ?? 1200}</span>
    </Link>
  );
}
```

- [ ] **Step 3.3: Create `frontend/components/layout/Topbar.tsx`**

```tsx
import { LiveIndicator } from "@/components/primitives/LiveIndicator";
import { UserPill } from "./UserPill";

export function Topbar({ onlineCount }: { onlineCount?: number }) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] px-8 py-4">
      <div className="flex items-center gap-2.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs text-[var(--color-text-3)] font-mono w-[300px]">
        <span>⌕</span><span>Find a handle or problem…</span>
      </div>
      <div className="flex items-center gap-5">
        <LiveIndicator count={onlineCount} />
        <UserPill />
      </div>
    </header>
  );
}
```

- [ ] **Step 3.4: Create `frontend/components/layout/AppShell.tsx`**

```tsx
import { Rail } from "./Rail";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[72px_1fr]">
      <Rail />
      <div className="flex flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.5: Create `frontend/app/(app)/layout.tsx`**

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hydrated, hydrate } = useAuth();

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { if (hydrated && !user) router.replace("/login"); }, [hydrated, user, router]);

  if (!hydrated) return null;
  if (!user) return null;
  return <AppShell>{children}</AppShell>;
}
```

---

## Task 4: Auth — store, types, API client

**Files:**
- Create: `frontend/types/user.ts`
- Create: `frontend/lib/api.ts`
- Create: `frontend/stores/auth.ts`

- [ ] **Step 4.1: Create `frontend/types/user.ts`**

```ts
export interface User {
  id: string;
  username: string;
  email?: string | null;
  cf_handle?: string | null;
  cf_rating?: number;
  elo?: number;
  duel_wins?: number;
  duel_losses?: number;
  xp?: number;
  created_at?: string;
}
```

- [ ] **Step 4.2: Create `frontend/lib/api.ts`**

```ts
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
});

api.interceptors.request.use(config => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ca_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("ca_token");
      localStorage.removeItem("ca_user");
      if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
```

- [ ] **Step 4.3: Create `frontend/stores/auth.ts`**

```ts
"use client";
import { create } from "zustand";
import { api } from "@/lib/api";
import type { User } from "@/types/user";

interface State {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (token: string, user: User) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

export const useAuth = create<State>((set, get) => ({
  user: null, token: null, hydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("ca_token");
    const user = localStorage.getItem("ca_user");
    set({ token, user: user ? JSON.parse(user) as User : null, hydrated: true });
    if (token) get().refresh().catch(() => {});
  },
  setSession: (token, user) => {
    localStorage.setItem("ca_token", token);
    localStorage.setItem("ca_user", JSON.stringify(user));
    set({ token, user, hydrated: true });
  },
  refresh: async () => {
    const { data } = await api.get<User>("/auth/me");
    localStorage.setItem("ca_user", JSON.stringify(data));
    set({ user: data });
  },
  logout: () => {
    localStorage.removeItem("ca_token");
    localStorage.removeItem("ca_user");
    set({ user: null, token: null });
  },
}));
```

---

## Task 5: Auth pages — login, register, settings

**Files:**
- Create: `frontend/app/login/page.tsx`
- Create: `frontend/app/register/page.tsx`
- Create: `frontend/app/(app)/profile/settings/page.tsx`

- [ ] **Step 5.1: Create `frontend/app/login/page.tsx`**

```tsx
"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuth(s => s.setSession);
  const [id, setId] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const body = id.includes("@") ? { email: id, password: pw } : { username: id, password: pw };
      const tok = await api.post<{ access_token: string }>("/auth/login", body);
      const token = tok.data.access_token;
      localStorage.setItem("ca_token", token);
      const me = await api.get("/auth/me");
      setSession(token, me.data);
      router.replace("/play");
    } catch (e: any) {
      setErr(e.response?.data?.detail ?? "Login failed");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6 font-mono text-xs tracking-[0.3em] text-[var(--color-neon-pink)]">// ENTER THE ARENA</div>
      <NeonText as="h1" className="mb-2 text-5xl tracking-[-1px] leading-none">Sign in.</NeonText>
      <p className="mb-8 text-sm text-[var(--color-text-3)]">A challenger appears every minute. Don't be late.</p>
      <form onSubmit={submit} className="space-y-4">
        <input value={id} onChange={e => setId(e.target.value)} required placeholder="username or email"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-1)] outline-none placeholder:text-[var(--color-text-4)] focus:border-[var(--color-border-hot)]" />
        <input value={pw} onChange={e => setPw(e.target.value)} required type="password" placeholder="password"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-1)] outline-none placeholder:text-[var(--color-text-4)] focus:border-[var(--color-border-hot)]" />
        {err && <div className="font-mono text-xs text-[var(--color-fail-red)]">{err}</div>}
        <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? "..." : "Enter"}</Button>
      </form>
      <p className="mt-8 text-center text-sm text-[var(--color-text-3)]">
        New challenger? <Link href="/register" className="text-[var(--color-neon-cyan)] hover:underline">Register here</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 5.2: Create `frontend/app/register/page.tsx`**

```tsx
"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuth(s => s.setSession);
  const [username, setUsername] = useState(""); const [email, setEmail] = useState("");
  const [pw, setPw] = useState(""); const [cf, setCf] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      await api.post("/auth/register", { username, email: email || null, password: pw, cf_handle: cf || null });
      const tok = await api.post<{ access_token: string }>("/auth/login", { username, password: pw });
      const token = tok.data.access_token;
      localStorage.setItem("ca_token", token);
      const me = await api.get("/auth/me");
      setSession(token, me.data);
      router.replace("/play");
    } catch (e: any) {
      setErr(e.response?.data?.detail ?? "Registration failed");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6 font-mono text-xs tracking-[0.3em] text-[var(--color-neon-pink)]">// FORGE YOUR LEGACY</div>
      <NeonText as="h1" className="mb-8 text-5xl tracking-[-1px] leading-none">Claim a handle.</NeonText>
      <form onSubmit={submit} className="space-y-4">
        <input value={username} onChange={e => setUsername(e.target.value)} required placeholder="username"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-hot)]" />
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="email (optional)"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-hot)]" />
        <input value={pw} onChange={e => setPw(e.target.value)} required type="password" placeholder="password"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-hot)]" />
        <input value={cf} onChange={e => setCf(e.target.value)} placeholder="codeforces handle (you'll need this to duel)"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-hot)]" />
        {err && <div className="font-mono text-xs text-[var(--color-fail-red)]">{err}</div>}
        <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? "..." : "Forge"}</Button>
      </form>
      <p className="mt-8 text-center text-sm text-[var(--color-text-3)]">
        Already in the arena? <Link href="/login" className="text-[var(--color-neon-cyan)] hover:underline">Sign in</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 5.3: Create `frontend/app/(app)/profile/settings/page.tsx`**

```tsx
"use client";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";

export default function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const [cf, setCf] = useState(user?.cf_handle ?? "");
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveCF(e: FormEvent) {
    e.preventDefault(); setMsg(null); setBusy(true);
    try {
      const v = await api.get<{ exists: boolean }>(`/cf/handle/${encodeURIComponent(cf)}/validate`);
      if (!v.data.exists) { setMsg({ err: "Codeforces handle not found." }); return; }
      await api.put("/auth/cf-handle", { cf_handle: cf });
      await refresh();
      setMsg({ ok: "Handle linked." });
    } catch (e: any) {
      setMsg({ err: e.response?.data?.detail ?? "Failed to link handle." });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl tracking-[-0.5px] text-[var(--color-text-1)]">Settings</h1>
      <Card>
        <div className="font-mono text-[11px] tracking-[0.25em] text-[var(--color-text-3)] uppercase mb-3">Codeforces handle</div>
        <form onSubmit={saveCF} className="flex gap-3">
          <input value={cf} onChange={e => setCf(e.target.value)} placeholder="your CF handle" required
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-sm" />
          <Button type="submit" disabled={busy}>{busy ? "..." : "Save"}</Button>
        </form>
        {msg?.ok && <div className="mt-3 font-mono text-xs text-[var(--color-ok-green)]">{msg.ok}</div>}
        {msg?.err && <div className="mt-3 font-mono text-xs text-[var(--color-fail-red)]">{msg.err}</div>}
      </Card>
      <Card>
        <div className="font-mono text-[11px] tracking-[0.25em] text-[var(--color-text-3)] uppercase mb-3">Session</div>
        <Button variant="ghost" onClick={() => { logout(); window.location.href = "/login"; }}>Log out</Button>
      </Card>
    </div>
  );
}
```

---

## Task 6: Landing page (logged-out hero)

**Files:**
- Create: `frontend/app/(marketing)/page.tsx`

- [ ] **Step 6.1: Create landing page**

```tsx
import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 font-mono text-xs tracking-[0.3em] text-[var(--color-neon-pink)]">// CODE · ARENA · 2026</div>
      <NeonText as="h1" className="text-7xl tracking-[-2px] leading-[0.95]">Step into<br/>the duel.</NeonText>
      <p className="mt-6 max-w-2xl text-base text-[var(--color-text-2)]">
        Real-time Codeforces duels. A ladder of five problems, each step raising the rating. First to clear the ladder advances their legacy. Last to reach the next problem retreats.
      </p>
      <div className="mt-10 flex gap-4">
        <Link href="/register"><Button size="lg">Enter the arena</Button></Link>
        <Link href="/login"><Button size="lg" variant="ghost">I have a handle</Button></Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 6.2: Add root redirect for logged-in users — create `frontend/app/(marketing)/layout.tsx`**

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hydrated, hydrate } = useAuth();
  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { if (hydrated && user) router.replace("/play"); }, [hydrated, user, router]);
  return <>{children}</>;
}
```

---

## Task 7: ELO math library (TDD)

**Files:**
- Create: `frontend/lib/elo.ts`
- Create: `frontend/lib/tier.ts`
- Create: `frontend/tests/lib/elo.test.ts`
- Create: `frontend/tests/lib/tier.test.ts`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/tests/setup.ts`

- [ ] **Step 7.1: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"], globals: true },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 7.2: Create `frontend/tests/setup.ts`**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 7.3: Add test script to `frontend/package.json`**

Inside `scripts`, add `"test": "vitest run"` and `"test:watch": "vitest"`.

- [ ] **Step 7.4: Create `frontend/lib/tier.ts`**

```ts
export type TierKey = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND" | "MASTER" | "LEGEND";

export interface Tier { key: TierKey; min: number; max: number; kFactor: number; }

export const TIERS: Tier[] = [
  { key: "BRONZE",   min: 0,    max: 999,    kFactor: 40 },
  { key: "SILVER",   min: 1000, max: 1299,   kFactor: 40 },
  { key: "GOLD",     min: 1300, max: 1599,   kFactor: 32 },
  { key: "PLATINUM", min: 1600, max: 1899,   kFactor: 32 },
  { key: "DIAMOND",  min: 1900, max: 2199,   kFactor: 24 },
  { key: "MASTER",   min: 2200, max: 2499,   kFactor: 16 },
  { key: "LEGEND",   min: 2500, max: 99999,  kFactor: 16 },
];

export function tierForElo(elo: number): Tier {
  return TIERS.find(t => elo >= t.min && elo <= t.max) ?? TIERS[0];
}

export function divisionForElo(elo: number): "I" | "II" | "III" | null {
  const t = tierForElo(elo);
  if (t.key === "LEGEND") return null;
  const span = (t.max - t.min + 1) / 3;
  const offset = elo - t.min;
  if (offset < span)        return "III";
  if (offset < span * 2)    return "II";
  return "I";
}
```

- [ ] **Step 7.5: Create `frontend/tests/lib/tier.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { tierForElo, divisionForElo } from "@/lib/tier";

describe("tierForElo", () => {
  it("returns BRONZE for low elo", () => expect(tierForElo(0).key).toBe("BRONZE"));
  it("returns SILVER at boundary", () => expect(tierForElo(1000).key).toBe("SILVER"));
  it("returns GOLD at 1300", () => expect(tierForElo(1300).key).toBe("GOLD"));
  it("returns PLATINUM at 1700", () => expect(tierForElo(1700).key).toBe("PLATINUM"));
  it("returns DIAMOND at 1900", () => expect(tierForElo(1900).key).toBe("DIAMOND"));
  it("returns MASTER at 2200", () => expect(tierForElo(2200).key).toBe("MASTER"));
  it("returns LEGEND at 2500", () => expect(tierForElo(2500).key).toBe("LEGEND"));
  it("k-factor decreases with tier", () => {
    expect(tierForElo(500).kFactor).toBe(40);
    expect(tierForElo(1500).kFactor).toBe(32);
    expect(tierForElo(2000).kFactor).toBe(24);
    expect(tierForElo(2300).kFactor).toBe(16);
  });
});

describe("divisionForElo", () => {
  it("returns III at tier bottom", () => expect(divisionForElo(1000)).toBe("III"));
  it("returns I at tier top", () => expect(divisionForElo(1299)).toBe("I"));
  it("LEGEND has no division", () => expect(divisionForElo(2600)).toBe(null));
});
```

- [ ] **Step 7.6: Create `frontend/lib/elo.ts`**

```ts
import { tierForElo } from "./tier";

export type DuelResult = "win" | "loss" | "draw";

export function expectedScore(myElo: number, oppElo: number): number {
  return 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
}

export function eloDelta(myElo: number, oppElo: number, result: DuelResult): number {
  const k = tierForElo(myElo).kFactor;
  const actual = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  return Math.round(k * (actual - expectedScore(myElo, oppElo)));
}

export function applyDelta(currentElo: number, delta: number): number {
  return Math.max(0, currentElo + delta);
}
```

- [ ] **Step 7.7: Create `frontend/tests/lib/elo.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { expectedScore, eloDelta, applyDelta } from "@/lib/elo";

describe("expectedScore", () => {
  it("returns 0.5 for equal elos", () => expect(expectedScore(1500, 1500)).toBeCloseTo(0.5));
  it("favors higher elo", () => expect(expectedScore(1700, 1500)).toBeGreaterThan(0.5));
  it("disfavors lower elo", () => expect(expectedScore(1300, 1500)).toBeLessThan(0.5));
});

describe("eloDelta", () => {
  it("equal elos, win gives positive delta", () => expect(eloDelta(1500, 1500, "win")).toBeGreaterThan(0));
  it("equal elos, loss gives negative delta", () => expect(eloDelta(1500, 1500, "loss")).toBeLessThan(0));
  it("equal elos, draw gives zero", () => expect(eloDelta(1500, 1500, "draw")).toBe(0));
  it("bronze K-factor of 40 at equal elos = ±20", () => expect(eloDelta(500, 500, "win")).toBe(20));
  it("master K-factor of 16 at equal elos = ±8", () => expect(eloDelta(2300, 2300, "win")).toBe(8));
  it("upset gives bigger gain", () => {
    expect(eloDelta(1300, 1700, "win")).toBeGreaterThan(eloDelta(1500, 1500, "win"));
  });
});

describe("applyDelta", () => {
  it("floors at 0", () => expect(applyDelta(10, -20)).toBe(0));
  it("adds normally", () => expect(applyDelta(1500, 24)).toBe(1524));
});
```

- [ ] **Step 7.8: Run frontend tests**

```bash
cd frontend && npm test
```

Expected: all tests in elo.test.ts and tier.test.ts pass.

---

## Task 8: Type definitions for duel + WS

**Files:**
- Create: `frontend/types/duel.ts`
- Create: `frontend/types/ws.ts`
- Create: `frontend/types/cf.ts`

- [ ] **Step 8.1: Create `frontend/types/cf.ts`**

```ts
export interface CFProblem {
  contest_id: number;
  index: string;
  name: string;
  rating?: number;
  tags?: string[];
  problem_id: string;
}
```

- [ ] **Step 8.2: Create `frontend/types/duel.ts`**

```ts
import { CFProblem } from "./cf";
import { Verdict } from "@/components/primitives/VerdictPill";

export type DuelStatus = "pending" | "matched" | "active" | "complete" | "archived";
export type StepStatus = "pending" | "solved" | "skipped";

export interface DuelStep {
  step_index: number;
  rating: number;
  problem: CFProblem;
  host_status: StepStatus;
  opponent_status: StepStatus;
}

export interface DuelParticipant {
  user_id: string;
  username: string;
  cf_handle?: string | null;
  elo: number;
  tier: string;
  current_step: number;
  last_verdict?: { verdict: Verdict; testset?: number; submission_id?: number } | null;
}

export interface Duel {
  id: string;
  status: DuelStatus;
  host: DuelParticipant;
  opponent: DuelParticipant | null;
  steps: DuelStep[];
  started_at: string | null;
  finished_at: string | null;
  time_cap_seconds: number;
  winner_id: string | null;
}
```

- [ ] **Step 8.3: Create `frontend/types/ws.ts`**

```ts
import { Verdict } from "@/components/primitives/VerdictPill";
import { Duel } from "./duel";

export type QueueEvent =
  | { type: "queue_tick"; payload: { eta_seconds: number; queued_count: number } }
  | { type: "match_found"; payload: { duel_id: string; opponent: { handle: string; username: string; elo: number; tier: string } } };

export interface EloChange { before: number; after: number; delta: number; }

export type DuelEvent =
  | { type: "state";    payload: { state: Duel } }
  | { type: "verdict";  payload: { user_id: string; step_index: number; verdict: Verdict; testset?: number; submission_id: number } }
  | { type: "step_advance"; payload: { user_id: string; new_step_index: number } }
  | { type: "duel_complete"; payload: { winner_id: string | null; elo_changes: Record<string, EloChange> } }
  | { type: "opponent_disconnected"; payload: { user_id: string; reconnect_grace_ms: number } }
  | { type: "system"; payload: { message: string } };
```

---

## Task 9: WebSocket client + queue store

**Files:**
- Create: `frontend/lib/ws.ts`
- Create: `frontend/stores/queue.ts`
- Create: `frontend/stores/duel.ts`

- [ ] **Step 9.1: Create `frontend/lib/ws.ts`**

```ts
type Listener<E> = (event: E) => void;

export class TypedWS<E extends { type: string }> {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener<E>>();
  private url: string;
  private retry = 0;
  private intentionallyClosed = false;
  private connected = false;

  constructor(url: string) { this.url = url; }

  connect() {
    this.intentionallyClosed = false;
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.onmessage = e => {
      try {
        const data = JSON.parse(e.data) as E;
        this.listeners.forEach(l => l(data));
      } catch { /* ignore non-JSON frames */ }
    };
    socket.onopen = () => { this.connected = true; this.retry = 0; };
    socket.onclose = () => {
      this.connected = false;
      if (this.intentionallyClosed) return;
      const delay = Math.min(1000 * 2 ** this.retry++, 10_000);
      setTimeout(() => this.connect(), delay);
    };
    socket.onerror = () => socket.close();
  }

  send(payload: object) { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload)); }
  on(listener: Listener<E>) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  close() { this.intentionallyClosed = true; this.socket?.close(); }
  isConnected() { return this.connected; }
}

export function wsUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000";
  return `${base}${path}`;
}
```

- [ ] **Step 9.2: Create `frontend/stores/queue.ts`**

```ts
"use client";
import { create } from "zustand";
import { TypedWS, wsUrl } from "@/lib/ws";
import type { QueueEvent } from "@/types/ws";
import { api } from "@/lib/api";

interface State {
  queueId: string | null;
  status: "idle" | "searching" | "found" | "cancelled";
  etaSeconds: number;
  queuedCount: number;
  foundDuelId: string | null;
  socket: TypedWS<QueueEvent> | null;
  enqueue: (userId: string) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

export const useQueue = create<State>((set, get) => ({
  queueId: null, status: "idle", etaSeconds: 0, queuedCount: 0, foundDuelId: null, socket: null,

  async enqueue(userId: string) {
    set({ status: "searching" });
    const { data } = await api.post<{ queue_id: string; eta_seconds: number }>("/matchmaking/enqueue", { mode: "speedrun_ladder" });
    const sock = new TypedWS<QueueEvent>(wsUrl(`/ws/queue/${userId}`));
    sock.on(ev => {
      if (ev.type === "queue_tick")  set({ etaSeconds: ev.payload.eta_seconds, queuedCount: ev.payload.queued_count });
      if (ev.type === "match_found") set({ status: "found", foundDuelId: ev.payload.duel_id });
    });
    sock.connect();
    set({ queueId: data.queue_id, etaSeconds: data.eta_seconds, socket: sock });
  },

  async cancel() {
    const { queueId, socket } = get();
    if (queueId) { try { await api.delete(`/matchmaking/queue/${queueId}`); } catch {} }
    socket?.close();
    set({ status: "cancelled", queueId: null, socket: null });
  },

  reset() { get().socket?.close(); set({ status: "idle", queueId: null, foundDuelId: null, etaSeconds: 0, queuedCount: 0, socket: null }); },
}));
```

- [ ] **Step 9.3: Create `frontend/stores/duel.ts`**

```ts
"use client";
import { create } from "zustand";
import { TypedWS, wsUrl } from "@/lib/ws";
import type { DuelEvent, EloChange } from "@/types/ws";
import type { Duel } from "@/types/duel";
import { api } from "@/lib/api";

interface State {
  duel: Duel | null;
  recentEvents: { ts: number; text: string }[];
  socket: TypedWS<DuelEvent> | null;
  complete: { winnerId: string | null; eloChanges: Record<string, EloChange> } | null;
  load: (duelId: string) => Promise<void>;
  connect: (duelId: string) => void;
  disconnect: () => void;
}

export const useDuel = create<State>((set, get) => ({
  duel: null, recentEvents: [], socket: null, complete: null,

  async load(duelId) {
    const { data } = await api.get<Duel>(`/duel/${duelId}`);
    set({ duel: data });
  },

  connect(duelId) {
    const sock = new TypedWS<DuelEvent>(wsUrl(`/ws/duel/${duelId}`));
    sock.on(ev => {
      const d = get().duel;
      if (ev.type === "state") { set({ duel: ev.payload.state }); return; }
      if (ev.type === "verdict" && d) {
        const next = structuredClone(d);
        const target = next.host.user_id === ev.payload.user_id ? next.host : next.opponent;
        if (target) target.last_verdict = { verdict: ev.payload.verdict, testset: ev.payload.testset, submission_id: ev.payload.submission_id };
        const username = target?.username ?? ev.payload.user_id.slice(0, 6);
        set({
          duel: next,
          recentEvents: [{ ts: Date.now(), text: `${username} · ${ev.payload.verdict} on step ${ev.payload.step_index + 1}` }, ...get().recentEvents].slice(0, 20),
        });
      }
      if (ev.type === "step_advance" && d) {
        const next = structuredClone(d);
        const target = next.host.user_id === ev.payload.user_id ? next.host : next.opponent;
        if (target) target.current_step = ev.payload.new_step_index;
        set({ duel: next });
      }
      if (ev.type === "duel_complete") {
        set({ complete: { winnerId: ev.payload.winner_id, eloChanges: ev.payload.elo_changes } });
      }
    });
    sock.connect();
    set({ socket: sock });
  },

  disconnect() { get().socket?.close(); set({ socket: null }); },
}));
```

---

## Task 10: Backend — new SQLAlchemy models + Alembic migration

**Files:**
- Modify: `backend/app/models.py`
- Create: `backend/alembic/versions/20260522_phase1.py`

- [ ] **Step 10.1: Inspect current migrations directory**

```bash
ls backend/alembic/versions/
```

Capture latest revision id (becomes `down_revision` below).

- [ ] **Step 10.2: Append new models to `backend/app/models.py`**

Add after the existing `PracticeSheetItem` class:

```python
class DuelStep(Base):
    __tablename__ = "duel_steps"
    __table_args__ = (UniqueConstraint("duel_id", "step_index", name="uq_duel_step"),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    duel_id = Column(String(36), ForeignKey("duels.id"), nullable=False, index=True)
    step_index = Column(Integer, nullable=False)
    rating = Column(Integer, nullable=False)
    problem_id = Column(String(128), nullable=False)
    problem_contest_id = Column(Integer, nullable=False)
    problem_index = Column(String(8), nullable=False)
    problem_name = Column(String(255), nullable=False)
    problem_tags_json = Column(Text, nullable=True)

    host_status = Column(String(16), default="pending", nullable=False)
    host_solved_at = Column(DateTime, nullable=True)
    opponent_status = Column(String(16), default="pending", nullable=False)
    opponent_solved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class MatchmakingQueueEntry(Base):
    __tablename__ = "matchmaking_queue"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    mode = Column(String(32), default="speedrun_ladder", nullable=False)
    elo_at_enqueue = Column(Integer, nullable=False)
    deck_tags_json = Column(Text, nullable=True)
    enqueued_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=True)


class EloHistory(Base):
    __tablename__ = "elo_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    duel_id = Column(String(36), ForeignKey("duels.id"), nullable=False, index=True)
    elo_before = Column(Integer, nullable=False)
    elo_after = Column(Integer, nullable=False)
    delta = Column(Integer, nullable=False)
    opponent_id = Column(String(36), nullable=True)
    result = Column(String(8), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

Also add columns to existing tables (in `User` class):

```python
    elo = Column(Integer, default=1200, nullable=False)
    timezone = Column(String(64), nullable=True)
```

And in `Duel` class:

```python
    format = Column(String(32), default="speedrun_ladder", nullable=False)
    time_cap_seconds = Column(Integer, default=2700, nullable=False)  # 45 min
```

- [ ] **Step 10.3: Create `backend/alembic/versions/20260522_phase1.py`**

(Replace `<PREV>` with latest revision id from Step 10.1.)

```python
"""phase1 - matchmaking, duel steps, elo history

Revision ID: 20260522_phase1
Revises: <PREV>
Create Date: 2026-05-22

"""
from alembic import op
import sqlalchemy as sa

revision = "20260522_phase1"
down_revision = "<PREV>"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("elo", sa.Integer(), nullable=False, server_default="1200"))
        b.add_column(sa.Column("timezone", sa.String(64), nullable=True))

    with op.batch_alter_table("duels") as b:
        b.add_column(sa.Column("format", sa.String(32), nullable=False, server_default="speedrun_ladder"))
        b.add_column(sa.Column("time_cap_seconds", sa.Integer(), nullable=False, server_default="2700"))

    op.create_table("duel_steps",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("duel_id", sa.String(36), sa.ForeignKey("duels.id"), nullable=False, index=True),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("problem_id", sa.String(128), nullable=False),
        sa.Column("problem_contest_id", sa.Integer(), nullable=False),
        sa.Column("problem_index", sa.String(8), nullable=False),
        sa.Column("problem_name", sa.String(255), nullable=False),
        sa.Column("problem_tags_json", sa.Text(), nullable=True),
        sa.Column("host_status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("host_solved_at", sa.DateTime(), nullable=True),
        sa.Column("opponent_status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("opponent_solved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("duel_id", "step_index", name="uq_duel_step"),
    )

    op.create_table("matchmaking_queue",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, unique=True, index=True),
        sa.Column("mode", sa.String(32), nullable=False, server_default="speedrun_ladder"),
        sa.Column("elo_at_enqueue", sa.Integer(), nullable=False),
        sa.Column("deck_tags_json", sa.Text(), nullable=True),
        sa.Column("enqueued_at", sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
    )

    op.create_table("elo_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("duel_id", sa.String(36), sa.ForeignKey("duels.id"), nullable=False, index=True),
        sa.Column("elo_before", sa.Integer(), nullable=False),
        sa.Column("elo_after", sa.Integer(), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("opponent_id", sa.String(36), nullable=True),
        sa.Column("result", sa.String(8), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("elo_history")
    op.drop_table("matchmaking_queue")
    op.drop_table("duel_steps")
    with op.batch_alter_table("duels") as b:
        b.drop_column("time_cap_seconds"); b.drop_column("format")
    with op.batch_alter_table("users") as b:
        b.drop_column("timezone"); b.drop_column("elo")
```

- [ ] **Step 10.4: Run migration**

```bash
cd backend && alembic upgrade head
```

Expected: tables created, no errors. (If using `Base.metadata.create_all` startup path instead of alembic, that path will pick the new models automatically — see existing `app/main.py`.)

---

## Task 11: Backend — ELO service (TDD)

**Files:**
- Create: `backend/app/services/elo.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/services/__init__.py`
- Create: `backend/tests/services/test_elo.py`
- Modify: `backend/requirements.txt` (add pytest)

- [ ] **Step 11.1: Add pytest to `backend/requirements.txt`**

Append:

```
pytest
pytest-asyncio
```

Install: `pip install -r requirements.txt` from `backend/`.

- [ ] **Step 11.2: Create `backend/app/services/elo.py`**

```python
from dataclasses import dataclass
from typing import Literal

DuelResult = Literal["win", "loss", "draw"]


@dataclass(frozen=True)
class Tier:
    key: str
    min_elo: int
    max_elo: int
    k_factor: int


TIERS = (
    Tier("BRONZE",   0,    999,   40),
    Tier("SILVER",   1000, 1299,  40),
    Tier("GOLD",     1300, 1599,  32),
    Tier("PLATINUM", 1600, 1899,  32),
    Tier("DIAMOND",  1900, 2199,  24),
    Tier("MASTER",   2200, 2499,  16),
    Tier("LEGEND",   2500, 99999, 16),
)


def tier_for_elo(elo: int) -> Tier:
    for t in TIERS:
        if t.min_elo <= elo <= t.max_elo:
            return t
    return TIERS[0]


def expected_score(my_elo: int, opp_elo: int) -> float:
    return 1.0 / (1.0 + 10 ** ((opp_elo - my_elo) / 400.0))


def elo_delta(my_elo: int, opp_elo: int, result: DuelResult) -> int:
    k = tier_for_elo(my_elo).k_factor
    actual = {"win": 1.0, "draw": 0.5, "loss": 0.0}[result]
    return round(k * (actual - expected_score(my_elo, opp_elo)))


def apply_delta(current: int, delta: int) -> int:
    return max(0, current + delta)
```

- [ ] **Step 11.3: Create `backend/tests/services/test_elo.py`**

```python
from app.services.elo import tier_for_elo, expected_score, elo_delta, apply_delta


def test_tier_for_elo_bronze():
    assert tier_for_elo(0).key == "BRONZE"

def test_tier_for_elo_silver_boundary():
    assert tier_for_elo(1000).key == "SILVER"

def test_tier_for_elo_legend():
    assert tier_for_elo(2500).key == "LEGEND"

def test_k_factor_descending():
    assert tier_for_elo(500).k_factor == 40
    assert tier_for_elo(1500).k_factor == 32
    assert tier_for_elo(2000).k_factor == 24
    assert tier_for_elo(2300).k_factor == 16

def test_expected_score_equal_elos():
    assert abs(expected_score(1500, 1500) - 0.5) < 1e-9

def test_elo_delta_equal_win_bronze_is_20():
    assert elo_delta(500, 500, "win") == 20

def test_elo_delta_equal_loss_master_is_neg8():
    assert elo_delta(2300, 2300, "loss") == -8

def test_elo_delta_upset_larger():
    assert elo_delta(1300, 1700, "win") > elo_delta(1500, 1500, "win")

def test_apply_delta_floor():
    assert apply_delta(10, -20) == 0
```

- [ ] **Step 11.4: Create `backend/conftest.py`**

```python
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
```

- [ ] **Step 11.5: Run backend tests**

```bash
cd backend && pytest tests/services/test_elo.py -v
```

Expected: all 9 tests pass.

---

## Task 12: Backend — problem picker service (TDD)

**Files:**
- Create: `backend/app/services/problem_picker.py`
- Create: `backend/tests/services/test_problem_picker.py`

- [ ] **Step 12.1: Create `backend/app/services/problem_picker.py`**

```python
from __future__ import annotations
import random
import time
from dataclasses import dataclass, field
from typing import Iterable

from app.services.codeforces import CodeforcesService


@dataclass
class CandidateProblem:
    contest_id: int
    index: str
    name: str
    rating: int
    tags: list[str] = field(default_factory=list)

    @property
    def problem_id(self) -> str:
        return f"{self.contest_id}-{self.index}"


@dataclass
class _Cache:
    problems: list[CandidateProblem] = field(default_factory=list)
    fetched_at: float = 0.0


_PROBLEM_CACHE = _Cache()
_CACHE_TTL_SECONDS = 24 * 3600


def _refresh_cache() -> None:
    raw = CodeforcesService.fetch_problemset()
    out: list[CandidateProblem] = []
    for p in raw:
        d = p.model_dump() if hasattr(p, "model_dump") else p
        if not d.get("rating") or not d.get("contestId"):
            continue
        out.append(CandidateProblem(
            contest_id=d["contestId"],
            index=d["index"],
            name=d.get("name", ""),
            rating=d["rating"],
            tags=d.get("tags") or [],
        ))
    _PROBLEM_CACHE.problems = out
    _PROBLEM_CACHE.fetched_at = time.time()


def get_all_problems() -> list[CandidateProblem]:
    if not _PROBLEM_CACHE.problems or (time.time() - _PROBLEM_CACHE.fetched_at) > _CACHE_TTL_SECONDS:
        try:
            _refresh_cache()
        except Exception:
            pass
    return _PROBLEM_CACHE.problems


def step_ratings_for_elo(base_elo: int) -> list[int]:
    rounded = max(800, (base_elo // 100) * 100)
    return [rounded - 200, rounded - 100, rounded, rounded + 100, rounded + 200]


def pick_ladder(
    base_elo: int,
    exclude_problem_ids: Iterable[str] = (),
    deck_tags: Iterable[str] = (),
    rng: random.Random | None = None,
) -> list[CandidateProblem]:
    rng = rng or random.Random()
    excluded = set(exclude_problem_ids)
    deck = set(deck_tags)
    pool = get_all_problems()
    chosen: list[CandidateProblem] = []
    used: set[str] = set()
    for target in step_ratings_for_elo(base_elo):
        candidates = [
            p for p in pool
            if abs(p.rating - target) <= 50
            and p.problem_id not in excluded
            and p.problem_id not in used
        ]
        if deck:
            tagged = [p for p in candidates if any(t in deck for t in p.tags)]
            if tagged:
                candidates = tagged
        if not candidates:
            candidates = [p for p in pool if abs(p.rating - target) <= 150 and p.problem_id not in excluded and p.problem_id not in used]
        if not candidates:
            raise ValueError(f"no problem available near rating {target}")
        choice = rng.choice(candidates)
        chosen.append(choice)
        used.add(choice.problem_id)
    return chosen
```

- [ ] **Step 12.2: Create `backend/tests/services/test_problem_picker.py`**

```python
import random
from app.services import problem_picker
from app.services.problem_picker import CandidateProblem, pick_ladder, step_ratings_for_elo


def _stub_pool() -> list[CandidateProblem]:
    pool = []
    for rating in range(800, 3001, 100):
        for variant in range(8):
            pool.append(CandidateProblem(
                contest_id=1000 + rating + variant,
                index=chr(ord("A") + (variant % 6)),
                name=f"problem-{rating}-{variant}",
                rating=rating,
                tags=["dp"] if variant % 2 == 0 else ["graphs"],
            ))
    return pool


def test_step_ratings_for_elo_1500():
    assert step_ratings_for_elo(1500) == [1300, 1400, 1500, 1600, 1700]

def test_step_ratings_clamped_low():
    assert step_ratings_for_elo(700)[0] >= 600

def test_pick_ladder_returns_5_distinct(monkeypatch):
    pool = _stub_pool()
    monkeypatch.setattr(problem_picker, "get_all_problems", lambda: pool)
    rng = random.Random(42)
    chosen = pick_ladder(1500, rng=rng)
    assert len(chosen) == 5
    ids = [p.problem_id for p in chosen]
    assert len(set(ids)) == 5

def test_pick_ladder_respects_excludes(monkeypatch):
    pool = _stub_pool()
    monkeypatch.setattr(problem_picker, "get_all_problems", lambda: pool)
    # exclude every dp-tagged 1500
    excludes = {p.problem_id for p in pool if p.rating == 1500 and "dp" in p.tags}
    rng = random.Random(7)
    chosen = pick_ladder(1500, exclude_problem_ids=excludes, rng=rng)
    step_1500 = chosen[2]
    assert step_1500.problem_id not in excludes

def test_pick_ladder_prefers_deck_tags(monkeypatch):
    pool = _stub_pool()
    monkeypatch.setattr(problem_picker, "get_all_problems", lambda: pool)
    rng = random.Random(1)
    chosen = pick_ladder(1500, deck_tags=["dp"], rng=rng)
    # all 5 should have "dp" in tags since pool has plenty
    for p in chosen:
        assert "dp" in p.tags
```

- [ ] **Step 12.3: Run problem picker tests**

```bash
cd backend && pytest tests/services/test_problem_picker.py -v
```

Expected: 5 tests pass.

---

## Task 13: Backend — WS hub + central event bus

**Files:**
- Create: `backend/app/services/ws_hub.py`
- Modify: `backend/app/main.py`

- [ ] **Step 13.1: Create `backend/app/services/ws_hub.py`**

```python
from __future__ import annotations
import asyncio
import json
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WSHub:
    """Subscription registry keyed by (channel_kind, channel_id)."""

    def __init__(self) -> None:
        self._subscribers: dict[tuple[str, str], set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, kind: str, ident: str, ws: WebSocket) -> None:
        async with self._lock:
            self._subscribers[(kind, ident)].add(ws)

    async def unsubscribe(self, kind: str, ident: str, ws: WebSocket) -> None:
        async with self._lock:
            self._subscribers[(kind, ident)].discard(ws)
            if not self._subscribers[(kind, ident)]:
                self._subscribers.pop((kind, ident), None)

    async def broadcast(self, kind: str, ident: str, message: dict[str, Any]) -> None:
        text = json.dumps(message, default=str)
        async with self._lock:
            sockets = list(self._subscribers.get((kind, ident), ()))
        for ws in sockets:
            try:
                await ws.send_text(text)
            except Exception:
                # client will be cleaned on its own onclose path
                pass


hub = WSHub()
```

- [ ] **Step 13.2: Wire hub import into `backend/app/main.py`**

Top of file (with other imports):

```python
from app.services.ws_hub import hub
```

Existing `/ws/duel/{duel_id}` will be migrated to use `hub` in Task 16.

---

## Task 14: Backend — matchmaker service + routes

**Files:**
- Create: `backend/app/services/matchmaker.py`
- Create: `backend/app/api/routes/matchmaking.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/schemas.py`

- [ ] **Step 14.1: Add Pydantic schemas to `backend/app/schemas.py`**

Append:

```python
class EnqueueRequest(BaseModel):
    mode: str = "speedrun_ladder"
    deck_tags: Optional[list[str]] = None

class EnqueueResponse(BaseModel):
    queue_id: str
    eta_seconds: int
```

- [ ] **Step 14.2: Create `backend/app/services/matchmaker.py`**

```python
from __future__ import annotations
import asyncio
import json
import logging
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Duel, DuelParticipant, DuelStep, MatchmakingQueueEntry, User
from app.services.problem_picker import pick_ladder
from app.services.ws_hub import hub

log = logging.getLogger("matchmaker")

TICK_SECONDS = 1.0
INITIAL_WINDOW = 150
WIDEN_WINDOWS = [(60, 300), (120, 500)]  # (seconds_in_queue, window)


def _window_for(entry: MatchmakingQueueEntry) -> int:
    age = (datetime.utcnow() - entry.enqueued_at).total_seconds()
    window = INITIAL_WINDOW
    for threshold, w in WIDEN_WINDOWS:
        if age >= threshold:
            window = w
    return window


def _find_match(db: Session, entry: MatchmakingQueueEntry) -> MatchmakingQueueEntry | None:
    window = _window_for(entry)
    candidates = (
        db.query(MatchmakingQueueEntry)
        .filter(
            MatchmakingQueueEntry.id != entry.id,
            MatchmakingQueueEntry.mode == entry.mode,
            MatchmakingQueueEntry.elo_at_enqueue.between(entry.elo_at_enqueue - window, entry.elo_at_enqueue + window),
        )
        .order_by(MatchmakingQueueEntry.enqueued_at.asc())
        .all()
    )
    return candidates[0] if candidates else None


def _start_duel(db: Session, host: MatchmakingQueueEntry, opp: MatchmakingQueueEntry) -> Duel:
    host_user = db.query(User).filter(User.id == host.user_id).first()
    opp_user = db.query(User).filter(User.id == opp.user_id).first()
    if host_user is None or opp_user is None:
        raise RuntimeError("user vanished mid-match")

    base_elo = min(host_user.elo or 1200, opp_user.elo or 1200)

    deck = []
    try:
        if host.deck_tags_json: deck += json.loads(host.deck_tags_json) or []
        if opp.deck_tags_json:  deck += json.loads(opp.deck_tags_json) or []
    except Exception:
        deck = []

    problems = pick_ladder(base_elo, deck_tags=deck, rng=random.Random())

    duel = Duel(
        host_id=host.user_id, format="speedrun_ladder",
        max_participants=2, rating_target=base_elo,
        status="active", started_at=datetime.utcnow(),
        problem_id=problems[2].problem_id, problem_name=problems[2].name, problem_rating=problems[2].rating,
    )
    db.add(duel); db.flush()

    db.add(DuelParticipant(duel_id=duel.id, user_id=host.user_id, current_rating=host_user.elo or 1200))
    db.add(DuelParticipant(duel_id=duel.id, user_id=opp.user_id,  current_rating=opp_user.elo or 1200))

    for idx, p in enumerate(problems):
        db.add(DuelStep(
            duel_id=duel.id, step_index=idx, rating=p.rating,
            problem_id=p.problem_id, problem_contest_id=p.contest_id, problem_index=p.index,
            problem_name=p.name, problem_tags_json=json.dumps(p.tags),
        ))

    db.delete(host); db.delete(opp)
    db.commit()
    return duel


async def _tick() -> None:
    db: Session = next(get_db())
    try:
        entries = db.query(MatchmakingQueueEntry).order_by(MatchmakingQueueEntry.enqueued_at.asc()).all()
        paired: set[str] = set()
        for entry in entries:
            if entry.id in paired: continue
            opp = _find_match(db, entry)
            if not opp or opp.id in paired: continue
            try:
                duel = _start_duel(db, entry, opp)
            except Exception:
                log.exception("failed to start duel")
                db.rollback(); continue

            paired.add(entry.id); paired.add(opp.id)

            for user_id, other_id in ((entry.user_id, opp.user_id), (opp.user_id, entry.user_id)):
                other = db.query(User).filter(User.id == other_id).first()
                await hub.broadcast("queue", user_id, {
                    "type": "match_found",
                    "payload": {
                        "duel_id": duel.id,
                        "opponent": {
                            "user_id": other.id if other else other_id,
                            "username": other.username if other else other_id,
                            "handle": other.cf_handle if other else None,
                            "elo": (other.elo if other else 1200),
                        },
                    },
                })
    finally:
        db.close()


async def run_matchmaker_loop() -> None:
    log.info("matchmaker loop started")
    while True:
        try:
            await _tick()
        except Exception:
            log.exception("matchmaker tick error")
        await asyncio.sleep(TICK_SECONDS)
```

- [ ] **Step 14.3: Create `backend/app/api/routes/matchmaking.py`**

```python
from __future__ import annotations
import asyncio
import json
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import MatchmakingQueueEntry, User
from app.schemas import EnqueueRequest, EnqueueResponse
from app.services.ws_hub import hub
from app.api.routes.auth import _get_current_user

router = APIRouter(prefix="/matchmaking", tags=["matchmaking"])


@router.post("/enqueue", response_model=EnqueueResponse)
def enqueue(payload: EnqueueRequest, current_user: User = Depends(_get_current_user), db: Session = Depends(get_db)):
    if not current_user.cf_handle:
        raise HTTPException(status_code=400, detail="Link your Codeforces handle to play.")

    existing = db.query(MatchmakingQueueEntry).filter(MatchmakingQueueEntry.user_id == current_user.id).first()
    if existing:
        return EnqueueResponse(queue_id=existing.id, eta_seconds=30)

    entry = MatchmakingQueueEntry(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        mode=payload.mode,
        elo_at_enqueue=current_user.elo or 1200,
        deck_tags_json=json.dumps(payload.deck_tags or []),
        enqueued_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db.add(entry); db.commit()
    return EnqueueResponse(queue_id=entry.id, eta_seconds=30)


@router.delete("/queue/{queue_id}")
def cancel(queue_id: str, current_user: User = Depends(_get_current_user), db: Session = Depends(get_db)):
    entry = db.query(MatchmakingQueueEntry).filter(MatchmakingQueueEntry.id == queue_id, MatchmakingQueueEntry.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    db.delete(entry); db.commit()
    return {"ok": True}


@router.websocket("/../ws/queue/{user_id}")
async def _placeholder():  # mounted in main.py instead
    pass
```

- [ ] **Step 14.4: Mount router + start matchmaker in `backend/app/main.py`**

Add imports:

```python
from app.api.routes.matchmaking import router as matchmaking_router
from app.services.matchmaker import run_matchmaker_loop
```

Add route mount with existing routers:

```python
app.include_router(matchmaking_router)
```

Add startup hook (replace any existing `@app.on_event("startup")` with consolidated version):

```python
_background_tasks: list[asyncio.Task] = []

@app.on_event("startup")
async def _start_workers():
    _background_tasks.append(asyncio.create_task(run_matchmaker_loop()))

@app.on_event("shutdown")
async def _stop_workers():
    for t in _background_tasks: t.cancel()
```

(Make sure `import asyncio` is at the top of main.py.)

- [ ] **Step 14.5: Add queue WebSocket endpoint to `backend/app/main.py`**

Add this near the existing `@app.websocket("/ws/duel/{duel_id}")` block:

```python
@app.websocket("/ws/queue/{user_id}")
async def queue_ws(websocket: WebSocket, user_id: str):
    await websocket.accept()
    await hub.subscribe("queue", user_id, websocket)
    try:
        await websocket.send_json({"type": "connected", "payload": {"user_id": user_id}})
        while True:
            # passive listen — server pushes match_found via hub
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await hub.unsubscribe("queue", user_id, websocket)
```

- [ ] **Step 14.6: Smoke test — start backend**

```bash
cd backend && uvicorn app.main:app --reload
```

Expected: starts cleanly, matchmaker tick log line every second.

---

## Task 15: Backend — CF handle validation endpoint

**Files:**
- Create: `backend/app/api/routes/cf.py`
- Modify: `backend/app/main.py`

- [ ] **Step 15.1: Create `backend/app/api/routes/cf.py`**

```python
from fastapi import APIRouter
import httpx

router = APIRouter(prefix="/cf", tags=["codeforces"])


@router.get("/handle/{handle}/validate")
async def validate_handle(handle: str):
    url = f"https://codeforces.com/api/user.info?handles={handle}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url)
        data = r.json()
    except Exception:
        return {"exists": False, "reason": "unreachable"}
    return {"exists": data.get("status") == "OK", "reason": data.get("comment")}
```

- [ ] **Step 15.2: Mount in `backend/app/main.py`**

```python
from app.api.routes.cf import router as cf_router
app.include_router(cf_router)
```

---

## Task 16: Backend — Codeforces verdict poller + duel completion

**Files:**
- Create: `backend/app/services/cf_poller.py`
- Create: `backend/app/services/duel_completion.py`
- Modify: `backend/app/main.py`

- [ ] **Step 16.1: Create `backend/app/services/duel_completion.py`**

```python
from __future__ import annotations
import json
import logging
from datetime import datetime
from typing import Iterable

from sqlalchemy.orm import Session

from app.models import Duel, DuelParticipant, DuelStep, EloHistory, User
from app.services.elo import elo_delta, apply_delta
from app.services.ws_hub import hub

log = logging.getLogger("duel_completion")


def _participants(db: Session, duel: Duel) -> list[DuelParticipant]:
    return db.query(DuelParticipant).filter(DuelParticipant.duel_id == duel.id).order_by(DuelParticipant.joined_at.asc()).all()


def _steps_solved(db: Session, duel: Duel, user_id: str) -> int:
    rows = db.query(DuelStep).filter(DuelStep.duel_id == duel.id).all()
    parts = _participants(db, duel)
    if not parts: return 0
    is_host = parts[0].user_id == user_id
    return sum(1 for s in rows if (s.host_status if is_host else s.opponent_status) == "solved")


async def complete_duel(db: Session, duel: Duel, winner_user_id: str | None) -> None:
    parts = _participants(db, duel)
    if len(parts) != 2:
        log.warning("complete_duel called with %d participants", len(parts))
        return

    host_user = db.query(User).filter(User.id == parts[0].user_id).first()
    opp_user  = db.query(User).filter(User.id == parts[1].user_id).first()
    if not host_user or not opp_user: return

    if winner_user_id is None:
        host_steps = _steps_solved(db, duel, host_user.id)
        opp_steps  = _steps_solved(db, duel, opp_user.id)
        if host_steps > opp_steps:   winner_user_id = host_user.id
        elif opp_steps > host_steps: winner_user_id = opp_user.id

    if winner_user_id is None:
        host_result = opp_result = "draw"
    elif winner_user_id == host_user.id:
        host_result, opp_result = "win", "loss"
    else:
        host_result, opp_result = "loss", "win"

    host_delta = elo_delta(host_user.elo, opp_user.elo, host_result)
    opp_delta  = elo_delta(opp_user.elo, host_user.elo, opp_result)

    host_before = host_user.elo
    opp_before  = opp_user.elo
    host_user.elo = apply_delta(host_user.elo, host_delta)
    opp_user.elo  = apply_delta(opp_user.elo,  opp_delta)

    if host_result == "win":  host_user.duel_wins  = (host_user.duel_wins or 0) + 1
    if host_result == "loss": host_user.duel_losses = (host_user.duel_losses or 0) + 1
    if opp_result == "win":   opp_user.duel_wins   = (opp_user.duel_wins or 0) + 1
    if opp_result == "loss":  opp_user.duel_losses = (opp_user.duel_losses or 0) + 1

    db.add(EloHistory(user_id=host_user.id, duel_id=duel.id, elo_before=host_before, elo_after=host_user.elo, delta=host_delta, opponent_id=opp_user.id, result=host_result))
    db.add(EloHistory(user_id=opp_user.id,  duel_id=duel.id, elo_before=opp_before,  elo_after=opp_user.elo,  delta=opp_delta,  opponent_id=host_user.id, result=opp_result))

    duel.status = "complete"
    duel.winner_id = winner_user_id
    duel.finished_at = datetime.utcnow()
    db.commit()

    await hub.broadcast("duel", duel.id, {
        "type": "duel_complete",
        "payload": {
            "winner_id": winner_user_id,
            "elo_changes": {
                host_user.id: {"before": host_before, "after": host_user.elo, "delta": host_delta},
                opp_user.id:  {"before": opp_before,  "after": opp_user.elo,  "delta": opp_delta},
            },
        },
    })
```

- [ ] **Step 16.2: Create `backend/app/services/cf_poller.py`**

```python
from __future__ import annotations
import asyncio
import logging
import time
from datetime import datetime
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Duel, DuelParticipant, DuelStep, User
from app.services.duel_completion import complete_duel
from app.services.ws_hub import hub

log = logging.getLogger("cf_poller")

TICK_SECONDS = 3.0
PER_HANDLE_MIN_INTERVAL = 1.1  # CF rate limit
BACKOFF_INITIAL = 5.0
BACKOFF_MAX = 60.0

_last_seen_submission: dict[str, int] = {}
_last_call: dict[str, float] = {}
_backoff_until: dict[str, float] = {}

CF_VERDICT_MAP = {
    "OK": "AC", "WRONG_ANSWER": "WA", "TIME_LIMIT_EXCEEDED": "TLE", "MEMORY_LIMIT_EXCEEDED": "MLE",
    "RUNTIME_ERROR": "RE", "COMPILATION_ERROR": "CE", "TESTING": "RUNNING",
    "SKIPPED": "RE", "REJECTED": "RE", "PARTIAL": "WA", "PRESENTATION_ERROR": "WA",
    "IDLENESS_LIMIT_EXCEEDED": "TLE", "SECURITY_VIOLATED": "RE",
}


async def _fetch_status(handle: str) -> Optional[list[dict]]:
    now = time.time()
    if now < _backoff_until.get(handle, 0): return None
    if now - _last_call.get(handle, 0) < PER_HANDLE_MIN_INTERVAL: return None
    url = f"https://codeforces.com/api/user.status?handle={handle}&from=1&count=10"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
        _last_call[handle] = time.time()
        if r.status_code != 200:
            current = max(BACKOFF_INITIAL, _backoff_until.get(handle, 0) - time.time())
            _backoff_until[handle] = time.time() + min(BACKOFF_MAX, current * 2)
            return None
        data = r.json()
        if data.get("status") != "OK": return None
        _backoff_until[handle] = 0
        return data.get("result", [])
    except Exception:
        log.exception("cf fetch failed for %s", handle)
        _backoff_until[handle] = time.time() + 10
        return None


def _current_step(db: Session, duel: Duel, user_id: str) -> Optional[DuelStep]:
    parts = db.query(DuelParticipant).filter(DuelParticipant.duel_id == duel.id).order_by(DuelParticipant.joined_at.asc()).all()
    if len(parts) != 2: return None
    is_host = parts[0].user_id == user_id
    steps = db.query(DuelStep).filter(DuelStep.duel_id == duel.id).order_by(DuelStep.step_index.asc()).all()
    for s in steps:
        status = s.host_status if is_host else s.opponent_status
        if status == "pending":
            return s
    return None


async def _process_duel(db: Session, duel: Duel) -> None:
    parts = db.query(DuelParticipant).filter(DuelParticipant.duel_id == duel.id).order_by(DuelParticipant.joined_at.asc()).all()
    if len(parts) != 2: return
    duel_start_ts = int(duel.started_at.timestamp()) if duel.started_at else int(time.time())

    for idx, part in enumerate(parts):
        user = db.query(User).filter(User.id == part.user_id).first()
        if not user or not user.cf_handle: continue
        current = _current_step(db, duel, user.id)
        if not current: continue

        submissions = await _fetch_status(user.cf_handle)
        if submissions is None: continue

        # iterate from oldest of returned to newest
        for sub in reversed(submissions):
            sub_id = sub.get("id")
            if not sub_id: continue
            if sub_id <= _last_seen_submission.get(f"{user.cf_handle}:{duel.id}", 0): continue
            if sub.get("creationTimeSeconds", 0) < duel_start_ts: continue

            problem = sub.get("problem") or {}
            if problem.get("contestId") != current.problem_contest_id: continue
            if problem.get("index") != current.problem_index: continue

            cf_verdict = sub.get("verdict") or "TESTING"
            mapped = CF_VERDICT_MAP.get(cf_verdict, "RUNNING")
            testset = sub.get("passedTestCount")

            await hub.broadcast("duel", duel.id, {
                "type": "verdict",
                "payload": {
                    "user_id": user.id, "step_index": current.step_index,
                    "verdict": mapped, "testset": testset, "submission_id": sub_id,
                },
            })

            _last_seen_submission[f"{user.cf_handle}:{duel.id}"] = sub_id

            if mapped == "AC":
                is_host = (idx == 0)
                if is_host:
                    current.host_status = "solved"; current.host_solved_at = datetime.utcnow()
                else:
                    current.opponent_status = "solved"; current.opponent_solved_at = datetime.utcnow()
                db.commit()

                next_idx = current.step_index + 1
                await hub.broadcast("duel", duel.id, {
                    "type": "step_advance",
                    "payload": {"user_id": user.id, "new_step_index": next_idx},
                })

                steps_total = db.query(DuelStep).filter(DuelStep.duel_id == duel.id).count()
                if next_idx >= steps_total:
                    await complete_duel(db, duel, winner_user_id=user.id)
                    return


async def run_cf_poller_loop() -> None:
    log.info("cf_poller loop started")
    while True:
        db: Session = next(get_db())
        try:
            duels = db.query(Duel).filter(Duel.status == "active").all()
            for d in duels:
                try: await _process_duel(db, d)
                except Exception: log.exception("error processing duel %s", d.id)
        except Exception:
            log.exception("cf_poller tick error")
        finally:
            db.close()
        await asyncio.sleep(TICK_SECONDS)
```

- [ ] **Step 16.3: Start CF poller in `backend/app/main.py`**

```python
from app.services.cf_poller import run_cf_poller_loop
```

In `_start_workers`:

```python
    _background_tasks.append(asyncio.create_task(run_cf_poller_loop()))
```

---

## Task 17: Backend — extend duel REST + WS endpoints

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/api/routes/duel.py`

- [ ] **Step 17.1: Replace duel WS endpoint in `backend/app/main.py`**

Replace the existing `@app.websocket("/ws/duel/{duel_id}")` block with:

```python
@app.websocket("/ws/duel/{duel_id}")
async def duel_ws(websocket: WebSocket, duel_id: str):
    await websocket.accept()
    await hub.subscribe("duel", duel_id, websocket)
    db = next(get_db())
    try:
        state = _serialize_duel_state(db, duel_id)
        await websocket.send_json({"type": "state", "payload": {"state": state}})
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await hub.unsubscribe("duel", duel_id, websocket)
        db.close()
```

- [ ] **Step 17.2: Replace `_serialize_duel_state` body to expose the full state TS expects**

In `backend/app/main.py`, replace the existing `_serialize_duel_state` function with:

```python
def _serialize_duel_state(db: Session, duel_id: str):
    duel = db.query(Duel).filter(Duel.id == duel_id).first()
    if not duel:
        return {"exists": False}

    step_rows = (
        db.query(DuelStep)
        .filter(DuelStep.duel_id == duel.id)
        .order_by(DuelStep.step_index.asc())
        .all()
    )

    steps = [{
        "step_index": s.step_index,
        "rating": s.rating,
        "problem": {
            "contest_id": s.problem_contest_id,
            "index": s.problem_index,
            "name": s.problem_name,
            "rating": s.rating,
            "problem_id": s.problem_id,
            "tags": (json.loads(s.problem_tags_json) if s.problem_tags_json else []),
        },
        "host_status": s.host_status,
        "opponent_status": s.opponent_status,
    } for s in step_rows]

    participant_rows = (
        db.query(DuelParticipant)
        .filter(DuelParticipant.duel_id == duel.id)
        .order_by(DuelParticipant.joined_at.asc())
        .all()
    )

    from app.services.elo import tier_for_elo

    def _participant_payload(row, is_host: bool):
        user = db.query(User).filter(User.id == row.user_id).first()
        # current step = first step whose status for this side is "pending"
        current_step = next(
            (s.step_index for s in step_rows if (s.host_status if is_host else s.opponent_status) == "pending"),
            len(step_rows),
        )
        elo = (user.elo if user else 1200) or 1200
        return {
            "user_id": row.user_id,
            "username": user.username if user else row.user_id,
            "cf_handle": (user.cf_handle if user else None),
            "elo": elo,
            "tier": tier_for_elo(elo).key,
            "current_step": current_step,
            "last_verdict": None,
            "joined_at": row.joined_at.isoformat() if row.joined_at else None,
        }

    host_payload = _participant_payload(participant_rows[0], True) if len(participant_rows) >= 1 else None
    opp_payload  = _participant_payload(participant_rows[1], False) if len(participant_rows) >= 2 else None

    return {
        "exists": True,
        "id": duel.id,
        "status": duel.status,
        "host": host_payload,
        "opponent": opp_payload,
        "steps": steps,
        "started_at": duel.started_at.isoformat() if duel.started_at else None,
        "finished_at": duel.finished_at.isoformat() if duel.finished_at else None,
        "time_cap_seconds": duel.time_cap_seconds,
        "winner_id": duel.winner_id,
    }
```

Also import `DuelStep` at the top of main.py: `from .models import Duel, DuelParticipant, DuelStep, User`.

- [ ] **Step 17.3: Add GET /duel/{id} endpoint with full state**

In `backend/app/api/routes/duel.py`, add (if not already present):

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
# main.py imports _serialize_duel_state from where? — replicate it here or import. Simpler: reuse via app.services later.
```

For Phase 1 simplicity, expose a thin shim in main.py:

```python
@app.get("/duel/{duel_id}")
def get_duel(duel_id: str, db: Session = Depends(get_db)):
    return _serialize_duel_state(db, duel_id)
```

---

## Task 18: Backend — leaderboard endpoint

**Files:**
- Create: `backend/app/api/routes/leaderboard.py`
- Modify: `backend/app/main.py`

- [ ] **Step 18.1: Create router**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def top(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    rows = (
        db.query(User)
        .filter(User.elo != None)  # noqa: E711
        .order_by(User.elo.desc())
        .offset(offset).limit(min(limit, 200)).all()
    )
    return [
        {
            "rank": offset + i + 1,
            "user_id": u.id,
            "username": u.username,
            "cf_handle": u.cf_handle,
            "elo": u.elo or 1200,
            "duel_wins": u.duel_wins or 0,
            "duel_losses": u.duel_losses or 0,
        }
        for i, u in enumerate(rows)
    ]
```

- [ ] **Step 18.2: Mount in `backend/app/main.py`**

```python
from app.api.routes.leaderboard import router as leaderboard_router
app.include_router(leaderboard_router)
```

---

## Task 19: Frontend — /play dashboard

**Files:**
- Create: `frontend/app/(app)/play/page.tsx`
- Create: `frontend/components/dashboard/{HeroBattleCard,ProfileMicroCard,ModesGrid,RecentDuelsPanel,QuestsPanelStub}.tsx`

- [ ] **Step 19.1: Create `frontend/components/dashboard/HeroBattleCard.tsx`**

```tsx
"use client";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";

export function HeroBattleCard({ onBattle }: { onBattle: () => void }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--color-border-hot)] bg-[var(--color-surface)] p-10"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 30% 30%, rgba(236,72,153,0.18), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(168,85,247,0.18), transparent 55%)",
        boxShadow: "inset 0 0 60px rgba(236,72,153,0.12)",
      }}
    >
      <div className="mb-2 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)]">// THE ARENA AWAITS</div>
      <NeonText as="h1" className="text-6xl tracking-[-2px] leading-[0.95]">Step into<br/>the duel.</NeonText>
      <p className="mt-5 max-w-[480px] text-[15px] leading-relaxed text-[var(--color-text-2)]">
        A ladder of five problems. Each step raises the rating. First to clear the ladder advances their legacy. Last to reach the next problem… retreats.
      </p>
      <div className="mt-7 flex items-center gap-3.5">
        <Button size="lg" onClick={onBattle}>⚔ Enter arena</Button>
        <Link href="/play/friend"><Button variant="secondary">Friend duel</Button></Link>
        <Link href="/play/lobby"><Button variant="ghost">Browse lobbies</Button></Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 19.2: Create `frontend/components/dashboard/ProfileMicroCard.tsx`**

```tsx
"use client";
import { useAuth } from "@/stores/auth";
import { Card } from "@/components/primitives/Card";
import { StatTile } from "@/components/primitives/StatTile";
import { tierForElo, divisionForElo } from "@/lib/tier";

export function ProfileMicroCard() {
  const user = useAuth(s => s.user);
  if (!user) return null;
  const elo = user.elo ?? 1200;
  const tier = tierForElo(elo);
  const div = divisionForElo(elo);
  const wins = user.duel_wins ?? 0;
  const losses = user.duel_losses ?? 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-neon-violet)] to-[var(--color-neon-pink)] font-display text-2xl font-extrabold text-white glow-pink">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-lg text-[var(--color-text-1)]">{user.username}</div>
          <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-neon-cyan)]">
            {tier.key}{div ? ` ${div}` : ""}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="ELO" value={elo} />
        <StatTile label="W / L" value={`${wins}·${losses}`} delta={`${winRate}% wins`} deltaTone="neutral" />
      </div>
    </Card>
  );
}
```

- [ ] **Step 19.3: Create `frontend/components/dashboard/ModesGrid.tsx`**

```tsx
import Link from "next/link";
import { cn } from "@/lib/cn";

const MODES = [
  { href: "/play/queue",  glyph: "QM", name: "Quick match",    desc: "Matched by ELO ±150. ~30s queue, ~25 min duel.", tone: "pink" },
  { href: "/play/friend", glyph: "FD", name: "Friend duel",    desc: "Private room with 6-char code. Pick the curve.",  tone: "cyan" },
  { href: "/play/lobby",  glyph: "OL", name: "Open lobby",     desc: "Browse public rooms. Spectate or jump in.",       tone: "violet" },
  { href: "/play/async",  glyph: "AC", name: "Async challenge",desc: "Challenge a friend. 24 h to play.",               tone: "gold" },
] as const;

const TONE: Record<typeof MODES[number]["tone"], string> = {
  pink:   "bg-[var(--color-neon-pink)]/15 text-[var(--color-neon-pink)]",
  cyan:   "bg-[var(--color-neon-cyan)]/15 text-[var(--color-neon-cyan)]",
  violet: "bg-[var(--color-neon-violet)]/15 text-[var(--color-neon-violet)]",
  gold:   "bg-[var(--color-neon-gold)]/15 text-[var(--color-neon-gold)]",
};

export function ModesGrid() {
  return (
    <div className="grid grid-cols-4 gap-3.5">
      {MODES.map(m => (
        <Link key={m.href} href={m.href}
          className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-border-hot)]">
          <div className={cn("mb-3.5 flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm font-extrabold", TONE[m.tone])}>{m.glyph}</div>
          <div className="font-display text-[13px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-1)]">{m.name}</div>
          <div className="mt-1 text-xs leading-relaxed text-[var(--color-text-3)]">{m.desc}</div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 19.4: Create `frontend/components/dashboard/RecentDuelsPanel.tsx` (stub)**

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";

interface DuelRow { id: string; opponent: string; result: "win" | "loss"; delta: number; steps_cleared: number; duration_seconds: number; ended_at: string; }

export function RecentDuelsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-duels"],
    queryFn: async () => (await api.get<DuelRow[]>("/duel/recent")).data,
    retry: 0,
  });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">Recent duels</div>
        <span className="font-mono text-[11px] text-[var(--color-neon-cyan)] uppercase tracking-[0.2em]">View all →</span>
      </div>
      {isLoading && <div className="font-mono text-xs text-[var(--color-text-3)]">loading…</div>}
      {!isLoading && (!data || data.length === 0) && (
        <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">No duels yet. Enter the arena to begin your legacy.</div>
      )}
      {data && data.map(d => (
        <div key={d.id} className="grid grid-cols-[60px_1fr_70px_70px] items-center gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0">
          <div className={`font-display text-xs font-extrabold tracking-[0.15em] ${d.result === "win" ? "text-[var(--color-ok-green)]" : "text-[var(--color-fail-red)]"}`}>{d.result.toUpperCase()}</div>
          <div>
            <div className="text-sm font-semibold text-[var(--color-text-1)]">vs {d.opponent}</div>
            <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-3)]">{d.steps_cleared}/5 STEPS · {formatDur(d.duration_seconds)}</div>
          </div>
          <div className="text-right font-mono text-[11px] text-[var(--color-text-3)]">{timeAgo(d.ended_at)}</div>
          <div className={`text-right font-mono text-[13px] font-bold ${d.delta > 0 ? "text-[var(--color-ok-green)]" : "text-[var(--color-fail-red)]"}`}>{d.delta > 0 ? "+" : ""}{d.delta}</div>
        </div>
      ))}
    </Card>
  );
}

function formatDur(s: number) { const m = Math.floor(s / 60); const sec = s % 60; return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; }
function timeAgo(iso: string) { const d = new Date(iso); const ms = Date.now() - d.getTime(); const h = Math.round(ms / 3_600_000); if (h < 1) return "just now"; if (h < 24) return `${h}h ago`; return `${Math.round(h/24)}d ago`; }
```

- [ ] **Step 19.5: Create `frontend/components/dashboard/QuestsPanelStub.tsx`**

```tsx
import { Card } from "@/components/primitives/Card";

export function QuestsPanelStub() {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-2)] uppercase">Today's quests</div>
        <span className="font-mono text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.2em]">soon</span>
      </div>
      <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">Quests system lands in Phase 2.</div>
    </Card>
  );
}
```

- [ ] **Step 19.6: Create `frontend/app/(app)/play/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";
import { useEffect } from "react";
import { HeroBattleCard } from "@/components/dashboard/HeroBattleCard";
import { ProfileMicroCard } from "@/components/dashboard/ProfileMicroCard";
import { ModesGrid } from "@/components/dashboard/ModesGrid";
import { RecentDuelsPanel } from "@/components/dashboard/RecentDuelsPanel";
import { QuestsPanelStub } from "@/components/dashboard/QuestsPanelStub";
import { Card } from "@/components/primitives/Card";
import Link from "next/link";

export default function PlayPage() {
  const router = useRouter();
  const user = useAuth(s => s.user);

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
              <div className="font-mono text-[11px] tracking-[0.25em] text-[var(--color-neon-pink)] mb-1">// CODEFORCES HANDLE REQUIRED</div>
              <div className="text-sm text-[var(--color-text-1)]">Link your handle to enter the arena.</div>
            </div>
            <Link href="/profile/settings" className="font-mono text-[12px] tracking-[0.2em] text-[var(--color-neon-cyan)] uppercase">Link now →</Link>
          </div>
        </Card>
      )}

      <section className="grid grid-cols-[1fr_380px] gap-6">
        <HeroBattleCard onBattle={onBattle} />
        <ProfileMicroCard />
      </section>

      <section className="space-y-3.5">
        <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase">// Choose your mode</div>
        <ModesGrid />
      </section>

      <section className="grid grid-cols-[1fr_360px] gap-6">
        <RecentDuelsPanel />
        <QuestsPanelStub />
      </section>
    </div>
  );
}
```

---

## Task 20: Frontend — /play/queue searching overlay

**Files:**
- Create: `frontend/app/(app)/play/queue/page.tsx`
- Create: `frontend/components/arena/ArenaEntrance.tsx`

- [ ] **Step 20.1: Create `frontend/components/arena/ArenaEntrance.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";

export function ArenaEntrance({ opponentName }: { opponentName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg-void)]"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="font-mono text-[12px] tracking-[0.4em] text-[var(--color-neon-pink)] mb-4">
        // A CHALLENGER APPEARS
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="font-display text-7xl font-black tracking-[-2px] text-gradient-pink">
        {opponentName}
      </motion.h1>
    </motion.div>
  );
}
```

- [ ] **Step 20.2: Create `frontend/app/(app)/play/queue/page.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useQueue } from "@/stores/queue";
import { Button } from "@/components/primitives/Button";
import { NeonText } from "@/components/primitives/NeonText";
import { ArenaEntrance } from "@/components/arena/ArenaEntrance";

export default function QueuePage() {
  const router = useRouter();
  const user = useAuth(s => s.user);
  const { status, etaSeconds, queuedCount, foundDuelId, enqueue, cancel, reset } = useQueue();
  const [opponentName, setOpponentName] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!user) return;
    if (status === "idle") enqueue(user.id);
  }, [user, status, enqueue]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (status === "found" && foundDuelId) {
      const opp = useQueue.getState();
      setOpponentName(opp.queueId ? "challenger" : "challenger");
      const goto = setTimeout(() => { router.replace(`/duel/${foundDuelId}`); reset(); }, 1500);
      return () => clearTimeout(goto);
    }
  }, [status, foundDuelId, router, reset]);

  if (status === "found") return <ArenaEntrance opponentName={opponentName || "Challenger"} />;

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="mb-6 font-mono text-[12px] tracking-[0.4em] text-[var(--color-neon-pink)]">// SEARCHING…</div>
      <NeonText as="h1" className="text-5xl tracking-[-1.5px] mb-10">Finding a worthy opponent.</NeonText>

      <motion.div
        animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 30px rgba(236,72,153,0.3)", "0 0 60px rgba(236,72,153,0.5)", "0 0 30px rgba(236,72,153,0.3)"] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="my-8 flex h-32 w-32 items-center justify-center rounded-full border-2 border-[var(--color-neon-pink)] text-[var(--color-neon-pink)] font-display text-4xl font-black"
      >⚔</motion.div>

      <div className="grid grid-cols-3 gap-8 text-center mb-10">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">Queue ETA</div>
          <div className="font-mono text-2xl text-[var(--color-text-1)]">~{etaSeconds}s</div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">In queue</div>
          <div className="font-mono text-2xl text-[var(--color-text-1)]">{queuedCount}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">Elapsed</div>
          <div className="font-mono text-2xl text-[var(--color-text-1)]">{String(Math.floor(elapsed/60)).padStart(2,"0")}:{String(elapsed%60).padStart(2,"0")}</div>
        </div>
      </div>

      <Button variant="ghost" onClick={async () => { await cancel(); router.replace("/play"); }}>Cancel queue</Button>
    </div>
  );
}
```

---

## Task 21: Frontend — live duel HUD (`/duel/[id]`)

**Files:**
- Create: `frontend/app/(app)/duel/[id]/page.tsx`
- Create: `frontend/components/arena/{LadderRail,OpponentPanel,ProblemCard,DuelTimer,VictoryOverlay,NumberTicker}.tsx`

- [ ] **Step 21.1: Create `frontend/components/arena/LadderRail.tsx`**

```tsx
import { cn } from "@/lib/cn";

interface Step { step_index: number; status: "pending" | "solved" | "skipped"; }

export function LadderRail({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map(s => (
        <div key={s.step_index} className={cn(
          "h-2 w-12 rounded-full transition",
          s.status === "solved" ? "bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-violet)]" :
          s.step_index === current ? "bg-[var(--color-neon-cyan)]/40 ring-1 ring-[var(--color-neon-cyan)]" :
          "bg-[var(--color-surface-2)]"
        )} />
      ))}
    </div>
  );
}
```

- [ ] **Step 21.2: Create `frontend/components/arena/OpponentPanel.tsx`**

```tsx
import { cn } from "@/lib/cn";
import { LadderRail } from "./LadderRail";
import { VerdictPill, Verdict } from "@/components/primitives/VerdictPill";
import { tierForElo } from "@/lib/tier";

interface Props {
  align: "left" | "right";
  username: string;
  elo: number;
  steps: { step_index: number; status: "pending" | "solved" | "skipped" }[];
  current: number;
  lastVerdict?: { verdict: Verdict; testset?: number } | null;
}

export function OpponentPanel({ align, username, elo, steps, current, lastVerdict }: Props) {
  const tier = tierForElo(elo);
  return (
    <div className={cn("flex flex-col gap-2", align === "right" && "items-end text-right")}>
      <div className="flex items-center gap-2.5">
        <div className="font-display text-lg font-bold tracking-[-0.5px] text-[var(--color-text-1)]">{username}</div>
        <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-text-3)]">{tier.key} · ELO {elo}</div>
      </div>
      <LadderRail steps={steps} current={current} />
      <div className="font-mono text-[10px] text-[var(--color-text-3)] tracking-[0.1em]">Step {current + 1} / {steps.length}</div>
      {lastVerdict && <VerdictPill verdict={lastVerdict.verdict} testset={lastVerdict.testset} />}
    </div>
  );
}
```

- [ ] **Step 21.3: Create `frontend/components/arena/ProblemCard.tsx`**

```tsx
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { VerdictPill, Verdict } from "@/components/primitives/VerdictPill";

interface Props {
  rating: number;
  step: number;
  total: number;
  contestId: number;
  index: string;
  name: string;
  tags: string[];
  lastVerdict?: { verdict: Verdict; testset?: number } | null;
}

export function ProblemCard({ rating, step, total, contestId, index, name, tags, lastVerdict }: Props) {
  const url = `https://codeforces.com/contest/${contestId}/problem/${index}`;
  return (
    <Card className="w-full max-w-2xl mx-auto p-10 text-center border-[var(--color-border-hot)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg-haze)]">
      <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)] mb-2">// CURRENT STEP · {rating}</div>
      <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-3)] mb-4 uppercase">Step {step + 1} of {total}</div>
      <h2 className="font-display text-3xl font-bold tracking-[-1px] text-[var(--color-text-1)] mb-2">{contestId}{index} — {name}</h2>
      <div className="mb-7 font-mono text-[11px] tracking-[0.1em] text-[var(--color-text-3)]">{rating} · {tags.join(", ") || "—"}</div>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Button size="lg">↗ Open on Codeforces</Button>
      </a>
      {lastVerdict && (
        <div className="mt-7 inline-flex items-center gap-3 font-mono text-xs text-[var(--color-text-3)]">
          last submission: <VerdictPill verdict={lastVerdict.verdict} testset={lastVerdict.testset} />
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 21.4: Create `frontend/components/arena/DuelTimer.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

export function DuelTimer({ startedAt, capSeconds }: { startedAt: string; capSeconds: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const start = new Date(startedAt).getTime();
  const elapsed = Math.floor((now - start) / 1000);
  const remaining = Math.max(0, capSeconds - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return (
    <div className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-2)]">
      LIVE · {mm}:{ss} / {String(Math.floor(capSeconds/60)).padStart(2,"0")}:{String(capSeconds%60).padStart(2,"0")}
    </div>
  );
}
```

- [ ] **Step 21.5: Create `frontend/components/arena/NumberTicker.tsx`**

```tsx
"use client";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export function NumberTicker({ from, to, prefix = "" }: { from: number; to: number; prefix?: string }) {
  const spring = useSpring(from, { mass: 0.6, stiffness: 90, damping: 18 });
  const display = useTransform(spring, latest => `${prefix}${Math.round(latest)}`);
  useEffect(() => { spring.set(to); }, [to, spring]);
  return <motion.span>{display}</motion.span>;
}
```

- [ ] **Step 21.6: Create `frontend/components/arena/VictoryOverlay.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { NumberTicker } from "./NumberTicker";

interface Props {
  result: "win" | "loss" | "draw";
  myEloBefore: number;
  myEloAfter: number;
  myDelta: number;
  onRematch?: () => void;
}

export function VictoryOverlay({ result, myEloBefore, myEloAfter, myDelta }: Props) {
  const title = result === "win" ? "VICTORY." : result === "loss" ? "DEFEAT." : "DRAW.";
  const tone =
    result === "win"  ? "from-white to-[var(--color-ok-green)]" :
    result === "loss" ? "from-white to-[var(--color-neon-pink)]" :
                        "from-white to-[var(--color-neon-cyan)]";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg-void)]/95 backdrop-blur"
    >
      <motion.h1
        initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`font-display font-black text-8xl tracking-[-3px] bg-gradient-to-b ${tone} bg-clip-text text-transparent`}
      >{title}</motion.h1>

      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-8 flex items-center gap-6"
      >
        <div className="text-center">
          <div className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-text-3)] uppercase">ELO</div>
          <div className="font-mono text-4xl font-bold text-[var(--color-text-1)]">
            <NumberTicker from={myEloBefore} to={myEloAfter} />
          </div>
          <div className={`font-mono text-sm ${myDelta >= 0 ? "text-[var(--color-ok-green)]" : "text-[var(--color-fail-red)]"}`}>{myDelta >= 0 ? "+" : ""}{myDelta}</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mt-12 flex gap-3"
      >
        <Link href="/play"><Button size="lg">Back to arena</Button></Link>
        <Link href="/leaderboard"><Button size="lg" variant="ghost">Leaderboard</Button></Link>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 21.7: Create `frontend/app/(app)/duel/[id]/page.tsx`**

```tsx
"use client";
import { use, useEffect } from "react";
import { useDuel } from "@/stores/duel";
import { useAuth } from "@/stores/auth";
import { LadderRail } from "@/components/arena/LadderRail";
import { OpponentPanel } from "@/components/arena/OpponentPanel";
import { ProblemCard } from "@/components/arena/ProblemCard";
import { DuelTimer } from "@/components/arena/DuelTimer";
import { ScanlineOverlay } from "@/components/primitives/ScanlineOverlay";
import { VictoryOverlay } from "@/components/arena/VictoryOverlay";
import type { DuelParticipant } from "@/types/duel";

export default function DuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const me = useAuth(s => s.user);
  const { duel, load, connect, disconnect, complete } = useDuel();

  useEffect(() => {
    load(id).catch(() => {});
    connect(id);
    return () => disconnect();
  }, [id, load, connect, disconnect]);

  if (!duel) return <div className="flex min-h-[60vh] items-center justify-center font-mono text-[var(--color-text-3)]">loading duel…</div>;

  const self: DuelParticipant | null =
    duel.host && me && duel.host.user_id === me.id ? duel.host :
    duel.opponent && me && duel.opponent.user_id === me.id ? duel.opponent :
    duel.host ?? null;
  const opp: DuelParticipant | null = self?.user_id === duel.host?.user_id ? duel.opponent : duel.host;

  const mySteps = duel.steps.map(s => ({ step_index: s.step_index, status: self?.user_id === duel.host.user_id ? s.host_status : s.opponent_status }));
  const oppSteps = duel.steps.map(s => ({ step_index: s.step_index, status: self?.user_id === duel.host.user_id ? s.opponent_status : s.host_status }));

  const currentStep = duel.steps[self?.current_step ?? 0];
  const startedAt = duel.started_at ?? new Date().toISOString();

  const myEloChange = complete && me ? complete.eloChanges[me.id] : null;
  const result: "win" | "loss" | "draw" | null =
    complete && me
      ? (complete.winnerId == null ? "draw" : complete.winnerId === me.id ? "win" : "loss")
      : null;

  return (
    <>
      <ScanlineOverlay />
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <a href="/play" className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)] hover:text-[var(--color-text-1)]">◀ EXIT</a>
          <DuelTimer startedAt={startedAt} capSeconds={duel.time_cap_seconds} />
          <span className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-3)]">EMOTES soon</span>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <OpponentPanel align="left" username={self?.username ?? "you"} elo={self?.elo ?? 1200} steps={mySteps} current={self?.current_step ?? 0} lastVerdict={self?.last_verdict} />
          <OpponentPanel align="right" username={opp?.username ?? "—"} elo={opp?.elo ?? 1200} steps={oppSteps} current={opp?.current_step ?? 0} lastVerdict={opp?.last_verdict} />
        </div>

        {currentStep && (
          <ProblemCard
            rating={currentStep.rating}
            step={currentStep.step_index}
            total={duel.steps.length}
            contestId={currentStep.problem.contest_id}
            index={currentStep.problem.index}
            name={currentStep.problem.name}
            tags={currentStep.problem.tags ?? []}
            lastVerdict={self?.last_verdict}
          />
        )}
      </div>

      {result && myEloChange && (
        <VictoryOverlay
          result={result}
          myEloBefore={myEloChange.before}
          myEloAfter={myEloChange.after}
          myDelta={myEloChange.delta}
        />
      )}
    </>
  );
}
```

---

## Task 22: Frontend — leaderboard page

**Files:**
- Create: `frontend/app/(marketing)/leaderboard/page.tsx`

- [ ] **Step 22.1: Create page**

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives/Card";
import { NeonText } from "@/components/primitives/NeonText";
import { tierForElo } from "@/lib/tier";

interface Row { rank: number; user_id: string; username: string; elo: number; cf_handle?: string | null; duel_wins: number; duel_losses: number; }

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await api.get<Row[]>("/leaderboard")).data,
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-2 font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)]">// THE LEADERBOARD</div>
      <NeonText as="h1" className="mb-10 text-5xl tracking-[-1px]">Top of the arena.</NeonText>
      <Card>
        {isLoading && <div className="font-mono text-xs text-[var(--color-text-3)]">loading…</div>}
        {data && data.map(r => {
          const t = tierForElo(r.elo);
          return (
            <div key={r.user_id} className="grid grid-cols-[40px_1fr_120px_100px] items-center gap-4 border-b border-[var(--color-border)] py-3 last:border-b-0">
              <div className="font-display text-2xl font-extrabold text-[var(--color-text-3)]">{r.rank}</div>
              <div>
                <div className="text-[var(--color-text-1)] font-semibold">{r.username}</div>
                {r.cf_handle && <div className="font-mono text-[10px] tracking-[0.15em] text-[var(--color-text-3)]">@{r.cf_handle}</div>}
              </div>
              <div className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-neon-cyan)]">{t.key}</div>
              <div className="font-mono text-[18px] font-bold text-right text-[var(--color-text-1)]">{r.elo}</div>
            </div>
          );
        })}
      </Card>
    </main>
  );
}
```

---

## Task 23: Frontend — profile page (basic)

**Files:**
- Create: `frontend/app/(app)/profile/page.tsx`

- [ ] **Step 23.1: Create page**

```tsx
"use client";
import Link from "next/link";
import { useAuth } from "@/stores/auth";
import { Card } from "@/components/primitives/Card";
import { StatTile } from "@/components/primitives/StatTile";
import { NeonText } from "@/components/primitives/NeonText";
import { tierForElo, divisionForElo } from "@/lib/tier";
import { Button } from "@/components/primitives/Button";

export default function ProfilePage() {
  const user = useAuth(s => s.user);
  if (!user) return null;
  const elo = user.elo ?? 1200;
  const t = tierForElo(elo);
  const div = divisionForElo(elo);
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-neon-pink)] mb-1">// PROFILE</div>
          <NeonText as="h1" className="text-4xl tracking-[-1px]">{user.username}</NeonText>
          <div className="mt-1 font-mono text-[12px] tracking-[0.2em] text-[var(--color-neon-cyan)]">{t.key}{div ? ` ${div}` : ""}</div>
          {user.cf_handle && <div className="mt-1 font-mono text-[11px] text-[var(--color-text-3)]">@{user.cf_handle}</div>}
        </div>
        <Link href="/profile/settings"><Button variant="ghost">Settings</Button></Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="ELO" value={elo} />
        <StatTile label="Wins" value={user.duel_wins ?? 0} />
        <StatTile label="Losses" value={user.duel_losses ?? 0} />
        <StatTile label="XP" value={user.xp ?? 0} />
      </div>

      <Card>
        <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--color-text-3)] uppercase mb-3">Recent duels</div>
        <div className="font-mono text-xs text-[var(--color-text-3)] py-6 text-center">History lands in Phase 2.</div>
      </Card>
    </div>
  );
}
```

---

## Task 24: Plug-in adjustments to existing backend `/duel` route

**Files:**
- Modify: `backend/app/api/routes/duel.py`

- [ ] **Step 24.1: Inspect existing endpoints in `backend/app/api/routes/duel.py`** to confirm there is no conflict with new `GET /duel/{duel_id}` defined in main.py. If a conflicting route exists, keep this router's version and remove the main.py shim from Step 17.3.

- [ ] **Step 24.2: Add `GET /duel/recent` for the dashboard**

```python
from app.models import Duel, DuelParticipant, EloHistory, User
from fastapi import Depends
from app.db import get_db
from sqlalchemy.orm import Session
from app.api.routes.auth import _get_current_user


@router.get("/recent")
def recent_duels(limit: int = 10, current_user: User = Depends(_get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(EloHistory)
        .filter(EloHistory.user_id == current_user.id)
        .order_by(EloHistory.created_at.desc())
        .limit(min(limit, 50))
        .all()
    )
    out = []
    for h in rows:
        opp = db.query(User).filter(User.id == h.opponent_id).first() if h.opponent_id else None
        duel = db.query(Duel).filter(Duel.id == h.duel_id).first()
        out.append({
            "id": h.duel_id,
            "opponent": opp.username if opp else "—",
            "result": h.result if h.result in ("win", "loss") else "win",
            "delta": h.delta,
            "steps_cleared": 0,
            "duration_seconds": int((duel.finished_at - duel.started_at).total_seconds()) if (duel and duel.finished_at and duel.started_at) else 0,
            "ended_at": (duel.finished_at.isoformat() if duel and duel.finished_at else h.created_at.isoformat()),
        })
    return out
```

---

## Task 25: Verification — end-to-end smoke

**Files:** none (manual)

- [ ] **Step 25.1: Start backend**

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

Expected: server up, matchmaker + cf_poller startup logs.

- [ ] **Step 25.2: Start frontend**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 25.3: Register two test accounts and link CF handles**

Use two browser profiles. Register `tester1` and `tester2`. Link real-but-different CF handles in `/profile/settings`. Confirm the validator returns `exists: true`.

- [ ] **Step 25.4: Both accounts queue Quick Match**

Both click "Enter arena" → land on `/play/queue`. Expected: after up to a few ticks of the matchmaker (~1-2 s), both navigate to `/duel/{id}`.

- [ ] **Step 25.5: Submit on Codeforces**

From the duel HUD, click "Open on Codeforces" on step 1's problem for one of the accounts. Submit any code. Wait ≤6 s. Expected: verdict pill appears in the HUD for that user. On AC, step advances. After clearing step 5, victory overlay appears with ELO delta.

- [ ] **Step 25.6: Run all tests**

```bash
cd backend && pytest -v
cd ../frontend && npm test
```

Expected: all tests pass.

---

## Notes for the executor

- **No git commits yet** unless explicitly requested by the user — assemble the work, run the smoke test, then ask before committing.
- **CF API is real** in this plan. The poller hits production CF. If network is unavailable during dev, mock `_fetch_status` in `cf_poller.py` to return canned data.
- **Phase 2 features** (tiers/divs visual treatment beyond colors, streak, quests, replay) ship in a separate plan. The data model for tiers/elo is already present.
- **Phase 3 features** (emotes, friend duels, open lobby, async, decks active, cosmetics) ship in a separate plan. The dashboard mode tiles link to placeholder routes that 404 until then — that's intentional.
- **If the `Duel.format`/`time_cap_seconds` columns don't show up after `alembic upgrade head`**, fall back to letting `Base.metadata.create_all(bind=engine)` create them (already called at app startup in `main.py`). The SQLite migration is best-effort; the live ORM definitions are the source of truth in this codebase.
- **WebSocket reconnect:** the `TypedWS` client handles backoff. The duel store does not re-fetch state on reconnect in v1; navigation away/back will reload via REST.

---

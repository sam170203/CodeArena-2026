# Feedback System Design

**Date:** 2026-06-06
**Status:** Approved

## Overview

A lightweight in-app feedback system for Code Arena. Users can report bugs, suggestions, or improvements via a floating button (present on every app page) or a dedicated `/feedback` page. Submissions are emailed to the product owner via Resend.

## Entry Points

1. **Floating button** — fixed bottom-right pill button on every page inside the `(app)` route group. Clicking navigates to `/feedback`.
2. **Dedicated page** — `/feedback` (under the `(marketing)` route group, no auth required). Full form, accessible by direct link.

## Form Fields

All fields are optional. An empty submission is valid and accepted.

| Field | Type | Notes |
|---|---|---|
| Type | Select | Bug / Suggestion / Improvement / Other |
| Title | Text | Short one-liner |
| Description | Textarea | Multi-line, free-form |
| Email | Email input | For follow-up; not stored |
| Page URL | Hidden | Auto-captured from `window.location.href` |

## Architecture

### Frontend

- `app/(marketing)/feedback/page.tsx` — dedicated feedback page, renders `FeedbackForm`
- `components/layout/FeedbackButton.tsx` — floating pill button, imported into `app/(app)/layout.tsx`
- `components/feedback/FeedbackForm.tsx` — the form component (client component, handles submit + success state)

### API

- `app/api/feedback/route.ts` — Next.js POST route handler
  - Accepts `{ type?, title?, description?, email?, pageUrl? }`
  - No required fields — always processes the submission
  - Calls Resend SDK to send a formatted email to `aryan.pareek@quarq.io`
  - Returns `{ ok: true }` on success
  - Basic in-memory rate limit: 5 submissions per IP per hour

### Email

- Provider: **Resend** (free tier, 3k emails/month)
- Environment variable: `RESEND_API_KEY`
- Recipient: `aryan.pareek@quarq.io`
- Subject format: `[Code Arena Feedback] {type or "General"} — {title or "No title"}`
- Body: HTML email showing all submitted fields + page URL + timestamp

## Data Flow

```
User fills form (any/no fields)
  → POST /api/feedback
    → rate limit check (in-memory, per IP)
    → Resend.emails.send(...)
    → 200 { ok: true }
  → Frontend shows inline "Thanks for your feedback!" success state
```

## Key Behaviours

- **Empty submissions accepted** — no client-side or server-side required-field validation
- **Rate limiting** — 5 submissions per IP per hour (in-memory map; resets on server restart)
- **No auth required** — `/feedback` page is public; floating button visible to logged-in users only
- **Success state** — inline thank-you message replaces the submit button; no redirect
- **Page URL** — silently captured from `window.location.href` before navigation to `/feedback`

## Environment Variables

```
RESEND_API_KEY=re_...
```

Add to `.env.local` and Vercel project env vars.

## Files to Create / Modify

| Action | Path |
|---|---|
| Create | `app/(marketing)/feedback/page.tsx` |
| Create | `components/feedback/FeedbackForm.tsx` |
| Create | `components/layout/FeedbackButton.tsx` |
| Create | `app/api/feedback/route.ts` |
| Modify | `app/(app)/layout.tsx` — add `<FeedbackButton />` |
| Install | `resend` npm package |

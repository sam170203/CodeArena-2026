import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { formatSubject, formatBody, FeedbackPayload } from "@/lib/feedback-email";

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

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "Code Arena <onboarding@resend.dev>",
    to: "mudgalsaksham@gmail.com",
    subject: formatSubject(payload.type, payload.title),
    html: formatBody(payload),
  });

  return NextResponse.json({ ok: true });
}

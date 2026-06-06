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

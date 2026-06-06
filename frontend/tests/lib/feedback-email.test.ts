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

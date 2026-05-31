import { ImageResponse } from "next/og";

// Next.js App Router convention: app/icon.tsx becomes the favicon automatically.
// Renders a pink→violet square with the sword glyph (same as the rail logo).

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ec4899, #a855f7)",
          color: "#ffffff",
          fontSize: 22,
          fontWeight: 900,
          fontFamily: "system-ui",
        }}
      >
        ⚔
      </div>
    ),
    { ...size }
  );
}

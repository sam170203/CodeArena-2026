import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at 30% 30%, #ec4899 0%, #a855f7 60%, #1a0a35 100%)",
          color: "#ffffff",
          fontSize: 110,
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

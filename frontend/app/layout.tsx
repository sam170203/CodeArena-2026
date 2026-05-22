import "./globals.css";
import type { Metadata } from "next";
import { orbitron, inter, jetbrains } from "@/lib/fonts";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CodeArena · enter the arena",
  description:
    "Real-time Codeforces duels. A ladder of five problems. First to clear wins.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RitualProof — Proof, not promises",
  description: "Turn consistent skin check-ins into personal evidence for your beauty rituals.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

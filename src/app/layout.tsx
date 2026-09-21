import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoo AI · Operational Intelligence",
  description:
    "St. Louis Zoo — Zoo AI Operational Intelligence (Phase 1 demonstration, synthetic data).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

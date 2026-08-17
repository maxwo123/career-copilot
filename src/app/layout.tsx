import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Copilot",
  description:
    "Job application tracker with a Claude-powered resume workshop via MCP.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

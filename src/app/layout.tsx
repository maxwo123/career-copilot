import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/lib/theme";
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches))d.classList.add('dark')}catch(e){}})()` }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

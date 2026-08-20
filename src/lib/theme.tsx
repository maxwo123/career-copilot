"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "system", setTheme: () => {} });

function applyClass(theme: Theme) {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial = stored === "light" || stored === "dark" ? stored : "system";
    setThemeState(initial);
    applyClass(initial);
  }, []);

  // Listen for system preference changes when theme is "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem("theme") ?? "system") === "system") {
        applyClass("system");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    applyClass(t);
  }, []);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}

const ICON: Record<Theme, string> = { light: "☀️", dark: "🌙", system: "🖥️" };
const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(NEXT[theme])}
      className="rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
      title={`Theme: ${theme}`}
      aria-label={`Toggle theme (current: ${theme})`}
    >
      {ICON[theme]}
    </button>
  );
}

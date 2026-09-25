"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
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

let memoryTheme: Theme = "system";

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch { return memoryTheme; }
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("career-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("career-theme-change", callback);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "system" as Theme);

  useEffect(() => {
    applyClass(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (theme === "system") applyClass("system"); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    memoryTheme = t;
    try { localStorage.setItem("theme", t); } catch {}
    applyClass(t);
    window.dispatchEvent(new Event("career-theme-change"));
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
      type="button"
      className="flex size-10 items-center justify-center rounded-md text-sm transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
      title={`Theme: ${theme}`}
      aria-label={`Toggle theme (current: ${theme})`}
    >
      {ICON[theme]}
    </button>
  );
}

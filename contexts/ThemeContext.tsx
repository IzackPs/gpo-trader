"use client";

import { createContext, useContext, useEffect } from "react";

const STORAGE_KEY = "gpo-theme";

/** Only dark theme is supported. Kept for compatibility; theme is always "dark". */
export type Theme = "dark";

interface ThemeContextValue {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme() {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", "dark");
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

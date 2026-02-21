"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "gpo-locale";

export type Locale = "pt" | "en";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  return stored === "en" || stored === "pt" ? stored : "en";
}

function applyLocale(locale: Locale) {
  document.documentElement.setAttribute("lang", locale === "en" ? "en" : "pt-BR");
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, locale);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = getStoredLocale();
    setLocaleState(stored);
    applyLocale(stored);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    applyLocale(l);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

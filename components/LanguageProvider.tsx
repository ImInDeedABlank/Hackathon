"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import { t as translate, type UILang } from "@/lib/i18n";

type LanguageContextValue = {
  lang: UILang;
  setLang: (lang: UILang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_EVENT = "linguasim-language-change";

function applyLanguage(lang: UILang) {
  const root = document.documentElement;
  root.lang = lang === "ar" ? "ar" : "en";
  root.dir = lang === "ar" ? "rtl" : "ltr";
}

function readStoredLanguage(): UILang {
  const stored = window.localStorage.getItem("uiLanguage");
  return stored === "ar" ? "ar" : "en";
}

function subscribe(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== "uiLanguage") {
      return;
    }
    onStoreChange();
  };

  const onLanguageEvent = () => {
    onStoreChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(LANGUAGE_EVENT, onLanguageEvent);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LANGUAGE_EVENT, onLanguageEvent);
  };
}

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readStoredLanguage, () => "en");

  const setLang = (nextLang: UILang) => {
    window.localStorage.setItem("uiLanguage", nextLang);
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  };

  useEffect(() => {
    applyLanguage(lang);
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string) => translate(key, lang),
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

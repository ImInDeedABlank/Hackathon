"use client";

import { useEffect } from "react";

import { type UiLanguage } from "@/lib/i18n";

function applyLanguage(uiLanguage: UiLanguage) {
  const root = document.documentElement;
  const isArabic = uiLanguage === "ar";
  root.lang = isArabic ? "ar" : "en";
  root.dir = isArabic ? "rtl" : "ltr";
}

export default function LanguageProvider() {
  useEffect(() => {
    const stored = window.localStorage.getItem("uiLanguage");
    const uiLanguage: UiLanguage = stored === "ar" ? "ar" : "en";
    applyLanguage(uiLanguage);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== "uiLanguage") {
        return;
      }
      const nextLanguage: UiLanguage = event.newValue === "ar" ? "ar" : "en";
      applyLanguage(nextLanguage);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}


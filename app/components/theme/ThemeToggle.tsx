"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "linguasim-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: Theme = saved === "dark" || saved === "light" ? saved : systemDark ? "dark" : "light";

    setTheme(initialTheme);
    applyTheme(initialTheme);
    setReady(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  if (!ready) {
    return null;
  }

  return (
    <button type="button" onClick={toggleTheme} className="theme-toggle" aria-label="Toggle light and dark mode">
      <span className="theme-toggle-dot" aria-hidden="true" />
      {theme === "light" ? "Dark mode" : "Light mode"}
    </button>
  );
}

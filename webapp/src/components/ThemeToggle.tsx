"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme) || "system";
    setTheme(saved);
    apply(saved);
  }, []);

  function apply(t: Theme) {
    const root = document.documentElement;
    if (t === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
  }

  function cycle() {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    apply(next);
  }

  const icon = theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "🌗";
  return (
    <button
      className="icon-btn"
      onClick={cycle}
      aria-label={`Thema: ${theme}. Klik om te wisselen.`}
      title={`Thema: ${theme}`}
    >
      {icon}
    </button>
  );
}

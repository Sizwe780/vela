"use client";
import { useEffect, useState } from "react";
import styles from "./theme-toggle.module.css";
export function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const sync = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("vela-theme");
      } catch {}
      const next = saved === "light" || saved === "dark" ? saved : "light";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    sync();
    const local = (event: Event) => {
      const next = (event as CustomEvent).detail;
      if (next === "light" || next === "dark") setTheme(next);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("vela-theme", local);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("vela-theme", local);
    };
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("vela-theme", next);
    } catch {}
    window.dispatchEvent(new CustomEvent("vela-theme", { detail: next }));
  }
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label="Dark mode"
      aria-pressed={theme === "dark"}
      title="Toggle light or dark appearance"
    >
      {theme === "dark" ? "☾" : "☀"}
    </button>
  );
}

"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  /* Hydrate from localStorage / system preference */
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <motion.button
      type="button"
      className="theme-toggle"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
    >
      <motion.span
        key={dark ? "moon" : "sun"}
        initial={{ rotate: -30, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 30, opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{ display: "flex" }}
      >
        {dark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
      </motion.span>
    </motion.button>
  );
}

"use client";

import { useEffect, useReducer } from "react";

type State = {
  mounted: boolean;
  dark: boolean;
};

type Action =
  | { type: "init"; dark: boolean }
  | { type: "toggle" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "init":
      return { mounted: true, dark: action.dark };
    case "toggle":
      return { ...state, dark: !state.dark };
  }
}

const initialState: State = { mounted: false, dark: false };

export function ThemeToggle() {
  const [{ mounted, dark }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", isDark);
    dispatch({ type: "init", dark: isDark });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", dark);
  }, [dark, mounted]);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    dispatch({ type: "toggle" });
  }

  if (!mounted) {
    return (
      <button
        className="rounded-xl border bg-card p-2.5 text-muted transition-all duration-150 shadow-card"
        aria-label="Toggle theme"
      >
        <div className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="rounded-xl border bg-card p-2.5 text-muted hover:text-foreground hover:bg-card-hover transition-all duration-150 shadow-card"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

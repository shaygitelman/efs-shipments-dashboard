"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "efs-theme";
const CHANGE_EVENT = "efs-theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// The blocking script in app/layout.tsx already applied the real class to
// <html> before paint — this just reads it back. useSyncExternalStore (not
// useState+effect) is the correct tool for a value that lives outside React
// like this: it's built specifically to reconcile a server snapshot that
// can legitimately differ from the client's real value, without the
// hydration-mismatch warning a plain useState read would trigger.
function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: "light",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled — theme still works for this
      // session, it just won't persist across reloads.
    }
    // Our own DOM mutation above doesn't fire a "storage" event (that only
    // fires in OTHER tabs) — dispatch one so this tab's subscribers
    // re-read the snapshot and re-render immediately.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

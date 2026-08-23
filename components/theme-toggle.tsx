"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "מעבר למצב יום" : "מעבר למצב לילה"}
      title={theme === "dark" ? "מצב יום" : "מצב לילה"}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-header-foreground-muted transition-colors hover:bg-header-foreground/8 hover:text-header-foreground",
        className
      )}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

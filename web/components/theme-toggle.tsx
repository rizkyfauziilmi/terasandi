"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Switch } from "./ui/switch";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <Switch
      checked={isDark}
      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      aria-label="Toggle theme"
      size="lg"
      thumbIcon={
        <>
          <Sun
            className={cn(
              "absolute size-3 transition-all",
              isDark ? "rotate-90 scale-0" : "rotate-0 scale-100",
            )}
          />
          <Moon
            className={cn(
              "absolute size-3 transition-all",
              isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0",
            )}
          />
        </>
      }
    />
  );
}

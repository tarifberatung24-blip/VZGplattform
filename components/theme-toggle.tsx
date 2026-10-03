"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

/**
 * Layer 0 theme switch. Icon-only so it fits the glass header at every width;
 * the accessible name carries the state for screen readers.
 */
export function ThemeToggle({ className, labels }: { className?: string; labels?: { light: string; dark: string } }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === "dark"
  const label = isDark ? labels?.light ?? "Light theme" : labels?.dark ?? "Dark theme"

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--control-radius,0.1875rem)] border text-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 max-sm:size-11",
        className,
      )}
      style={{ borderColor: "var(--glass-border)" }}
    >
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </button>
  )
}

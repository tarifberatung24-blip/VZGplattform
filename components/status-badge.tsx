"use client"

import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n/language-context"
import { statusTone, toneClasses, type StatusKey } from "@/lib/status"

export function StatusBadge({ status, className }: { status: StatusKey; className?: string }) {
  const { t } = useLanguage()
  const tone = statusTone[status] ?? "neutral"
  const label = (t.status as Record<string, string>)[status] ?? status

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current opacity-70")} aria-hidden="true" />
      {label}
    </span>
  )
}
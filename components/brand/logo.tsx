import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-8 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground", className)} aria-label="KintexBG">
      K
    </span>
  )
}

export function Logo({
  className,
  textClassName,
  showText = true,
}: {
  className?: string
  textClassName?: string
  showText?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {showText ? (
        <span className={cn("font-sans text-lg font-bold leading-none tracking-tight text-foreground", textClassName)}>
          KintexBG <span className="text-xs font-semibold text-muted-foreground">BY VZG</span>
        </span>
      ) : null}
    </span>
  )
}

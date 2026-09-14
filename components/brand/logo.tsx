import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-8 place-items-center rounded-md bg-primary text-sm font-black text-primary-foreground", className)} aria-label="KintexBG">
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
          KintexBG <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">BY VZG CONSULT</span>
        </span>
      ) : null}
    </span>
  )
}

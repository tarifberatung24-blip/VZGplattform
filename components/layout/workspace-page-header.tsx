import type { ReactNode } from "react"

/**
 * The shared page container for authenticated workspace sub-pages: the same
 * padding and `max-w-[1440px]` rail as the dashboard, so headers, tables and
 * cards line up across every HORIZON surface.
 */
export function WorkspacePage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[calc(100svh-3.5rem)] bg-background px-4 py-5 text-foreground sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto min-w-0 max-w-[1440px]">{children}</div>
    </div>
  )
}

/**
 * The one page header for authenticated workspace sub-pages.
 *
 * It mirrors the dashboard header exactly — eyebrow, `text-3xl` title, muted
 * description — so every HORIZON surface shares the same heading scale. Before
 * this existed, module pages rendered a marketing-scale `text-5xl font-black`
 * hero inside the logged-in shell, which read as a landing page rather than a
 * working tool.
 */
export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-3">{action}</div> : null}
    </header>
  )
}

"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { HorizonSidebar } from "@/components/layout/horizon-sidebar"
import { LanguageSwitcher } from "@/components/language-switcher"
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { isKintexWorkspacePath } from "@/lib/kintex-navigation"

/**
 * The one authenticated HORIZON workspace shell.
 *
 * — Workspace routes: sidebar + compact workspace header + main content, with no
 *   public marketing chrome. The workspace owns the whole viewport.
 * — Everything else: children only. The public Layer 0 shell in app/layout.tsx
 *   supplies its own header and footer.
 *
 * `kintex-workspace` is kept as the CSS scope: globals.css styles `.kintex-panel`
 * and friends relative to it, so removing it would strip styling from the
 * authenticated workspace components.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/"

  if (!isKintexWorkspacePath(pathname)) {
    return <>{children}</>
  }

  const de = pathname === "/de" || pathname.startsWith("/de/")
  const skipText = de ? "Zum Inhalt" : "Към съдържанието"
  const toggleText = de ? "Navigation ein- oder ausblenden" : "Покажи или скрий навигацията"

  return (
    <TooltipProvider delay={0}>
      {/* The flex row must be the direct child of the sidebar. shadcn's sidebar
          reserves its space with a sibling gap element and relies on this row
          being a flex container; nesting an extra div collapses content under the
          fixed rail. `kintex-workspace` is applied here so its CSS variables
          cascade to both the sidebar and the inset. */}
      <SidebarProvider className="kintex-workspace bg-background text-foreground">
        <a href="#workspace-content" className="kintex-skip">
          {skipText}
        </a>
        <HorizonSidebar />
        <SidebarInset
          id="workspace-content"
          tabIndex={-1}
          className="min-h-svh min-w-0 focus-visible:outline-none"
        >
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-3 sm:px-4">
            <SidebarTrigger aria-label={toggleText} />
            {/* Brand lives in the sidebar. Shown here only while the sidebar is a
                drawer (below md), so exactly one instance is visible per viewport. */}
            <span className="truncate text-sm font-semibold tracking-tight md:hidden">
              HORIZON by VZG
            </span>
            <LanguageSwitcher className="ml-auto shrink-0" />
          </header>
          <div className="min-w-0 flex-1">{children}</div>
          {/* Space for the fixed bottom bar on mobile so content is not covered. */}
          <div className="h-16 md:hidden" aria-hidden="true" />
        </SidebarInset>
        <MobileBottomNav />
      </SidebarProvider>
    </TooltipProvider>
  )
}

"use client"

import { type ReactNode, useState } from "react"
import { usePathname } from "next/navigation"

import { Cookie, Settings } from "lucide-react"
import { cookieNoticeCopy } from "@/components/horizon/cookie-notice-copy"
import { HorizonSidebar } from "@/components/layout/horizon-sidebar"
import { LanguageSwitcher } from "@/components/language-switcher"
import { MobileBottomNav, type MobileWorkspacePanel } from "@/components/navigation/mobile-bottom-nav"
import { AiSearch } from "@/components/search/ai-search"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { openCookieSettings } from "@/lib/cookies/consent"
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
  const [mobilePanel, setMobilePanel] = useState<MobileWorkspacePanel>("closed")

  if (!isKintexWorkspacePath(pathname)) {
    return <>{children}</>
  }

  const de = pathname === "/de" || pathname.startsWith("/de/")
  const skipText = de ? "Zum Inhalt" : "Към съдържанието"
  const toggleText = de ? "Navigation ein- oder ausblenden" : "Покажи или скрий навигацията"
  const cookieLabel = cookieNoticeCopy[de ? "de" : "bg"].settingsLink

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
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-3 sm:px-4 max-md:h-[4.5rem] max-md:border-white/5 max-md:bg-[#202124] max-md:px-5">
            <SidebarTrigger aria-label={toggleText} className="hidden md:inline-flex" />
            {/* Brand lives in the sidebar. Shown here only while the sidebar is a
                drawer (below md), so exactly one instance is visible per viewport. */}
            <span role="img" aria-label="Horizon by VZG" className="logo-mask h-5 w-auto text-foreground md:hidden" />
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <AiSearch compact className="md:hidden" />
              <AiSearch className="hidden md:inline-flex" />
              <button
                type="button"
                onClick={() => setMobilePanel("settings")}
                aria-label={de ? "Einstellungen und Privatsphäre" : "Настройки и поверителност"}
                className="inline-flex size-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              >
                <Settings className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={openCookieSettings}
                aria-label={cookieLabel}
                title={cookieLabel}
                className="hidden size-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:inline-flex"
              >
                <Cookie className="size-4" aria-hidden="true" />
              </button>
              <LanguageSwitcher className="hidden shrink-0 md:block" />
            </div>
          </header>
          <div className="min-w-0 flex-1">{children}</div>
          {/* Space for the fixed bottom bar on mobile so content is not covered. */}
          <div className="h-24 md:hidden" aria-hidden="true" />
        </SidebarInset>
        <MobileBottomNav panel={mobilePanel} onPanelChange={setMobilePanel} />
      </SidebarProvider>
    </TooltipProvider>
  )
}

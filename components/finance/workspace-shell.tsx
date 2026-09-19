"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { UserSidebar } from "@/components/layout/user-sidebar"
import { isKintexWorkspacePath } from "@/lib/kintex-navigation"

/**
 * Wraps every page rendered through the root layout.
 * — Non-workspace routes: children only (GlobalHeader + GlobalFooter handle
 *   the chrome).
 * — Workspace routes (/dashboard, /steuer, /anspruch, /email-generator,
 *   /documents, …): render the slim institutional UserSidebar alongside
 *   the content. No second header — GlobalHeader is the single source of
 *   truth for site-wide chrome.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const de = pathname?.startsWith("/de/") || pathname === "/de"

  if (!isKintexWorkspacePath(pathname)) {
    return <>{children}</>
  }

  const skipText = de ? "Zum Inhalt" : "Към съдържанието"

  return (
    <div className="kintex-workspace min-h-screen bg-background text-foreground">
      <a href="#workspace-content" className="kintex-skip">
        {skipText}
      </a>
      <div className="mx-auto flex max-w-[1600px] items-start gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <UserSidebar />
        <main
          id="workspace-content"
          tabIndex={-1}
          className="min-w-0 flex-1 focus-visible:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  )
}

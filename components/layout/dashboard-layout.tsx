"use client"

import { ReactNode } from "react"
import { UserSidebar } from "./user-sidebar"
import { cn } from "@/lib/utils"

/**
 * DashboardLayout wraps authenticated internal pages with the UserSidebar.
 * On desktop the sidebar is a fixed-width rail; on mobile it is hidden and
 * the global hamburger header drives navigation.
 */
export function DashboardLayout({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="mx-auto flex max-w-[1600px] gap-8 px-5 py-8 sm:px-8 lg:px-12">
      <UserSidebar />
      <div className={cn("flex min-w-0 flex-1", className)} id="workspace-content" tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}


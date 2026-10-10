"use client"

import Link from "next/link"
import { localizedPath } from "@/lib/i18n/routing"
import { isKintexWorkspacePath, isSelfChromedPath } from "@/lib/kintex-navigation"
import { usePathname } from "next/navigation"
import { HorizonWordmark } from "@/components/brand/horizon-wordmark"

export function GlobalFooter() {
  const pathname = usePathname() ?? "/"
  // Authenticated workspace routes render the HORIZON shell (see WorkspaceShell).
  // The public Layer 0 footer must not appear inside the operational workspace, nor
  // under a route that owns its full chrome (`/office`, which renders its own header).
  if (isKintexWorkspacePath(pathname) || isSelfChromedPath(pathname)) return null
  const locale = pathname.startsWith("/de") ? "de" : "bg"
  const isDe = locale === "de"

  const links = [
    { href: "/impressum", label: isDe ? "Impressum" : "Импресум" },
    {
      href: "/datenschutz",
      label: isDe ? "Datenschutz" : "Поверителност",
    },
    { href: "/agb", label: isDe ? "AGB" : "ОУ" },
    { href: "/widerruf", label: isDe ? "Widerruf" : "Отказ" },
  ]

  return (
    <footer className="glass-chrome relative border-t backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <span>
          {"© 2026 "}
          <HorizonWordmark />
          {" by VZG"}
        </span>
        <nav className="flex flex-wrap gap-x-5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={localizedPath(link.href, locale)}
              className="inline-flex min-h-8 items-center transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}

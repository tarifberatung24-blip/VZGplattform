"use client"

import Link from "next/link"
import { localizedPath } from "@/lib/i18n/routing"
import { isKintexWorkspacePath, isSelfChromedPath } from "@/lib/kintex-navigation"
import { usePathname } from "next/navigation"
import { HorizonWordmark } from "@/components/brand/horizon-wordmark"
import { cookieNoticeCopy } from "@/components/horizon/cookie-notice-copy"
import { openCookieSettings } from "@/lib/cookies/consent"

export function GlobalFooter() {
  const pathname = usePathname() ?? "/"
  // Authenticated workspace routes render the HORIZON shell (see WorkspaceShell).
  // The public Layer 0 footer must not appear inside the operational workspace, nor
  // under a route that owns its full chrome (`/office`, which renders its own header).
  if (isKintexWorkspacePath(pathname) || isSelfChromedPath(pathname)) return null
  const locale = pathname.startsWith("/de") ? "de" : "bg"
  const isDe = locale === "de"

  const links = [
    { href: "/ratgeber", label: isDe ? "Ratgeber" : "Наръчник" },
    { href: "/vorlagen", label: isDe ? "Vorlagen" : "Готови писма" },
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
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 pt-4 pb-24 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:pb-4 lg:px-8">
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
              className="inline-flex min-h-11 items-center transition-colors hover:text-foreground md:min-h-8"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={openCookieSettings}
            className="inline-flex min-h-11 items-center transition-colors hover:text-foreground md:min-h-8"
          >
            {cookieNoticeCopy[locale].settingsLink}
          </button>
        </nav>
      </div>
    </footer>
  )
}

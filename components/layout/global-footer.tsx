"use client"

import Link from "next/link"
import { localizedPath } from "@/lib/i18n/routing"
import { isKintexWorkspacePath, isSelfChromedPath } from "@/lib/kintex-navigation"
import { usePathname } from "next/navigation"

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
    { href: "/contact", label: isDe ? "Kontakt" : "Контакт" },
    { href: "/agb", label: isDe ? "AGB" : "Общи условия" },
    { href: "/widerruf", label: isDe ? "Widerruf" : "Отказ" },
  ]

  return (
    <footer className="glass-chrome relative border-t backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto max-w-[1440px] px-5 py-10 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-10">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-black tracking-[-0.03em] text-foreground">HORIZON by VZG</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              VZG CONSULT · Tarifberater24
            </span>
          </div>

          <nav
            aria-label={isDe ? "Rechtliches" : "Правна информация"}
            className="grid grid-cols-2 gap-x-6 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-8"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={localizedPath(link.href, locale)}
                className="rounded-[var(--control-radius,0.1875rem)] py-2 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-muted-foreground md:shrink-0 md:pl-6 md:text-right">
            © 2024–2026 HORIZON by VZG
            <span className="block text-[10px] uppercase tracking-[0.2em]">Tarifberater24</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

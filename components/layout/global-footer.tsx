"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"

export function GlobalFooter() {
  const { locale } = useLanguage()
  const isDe = locale === "de"

  const links = [
    { href: "/impressum", label: isDe ? "Impressum" : "Импресум" },
    {
      href: "/datenschutz",
      label: isDe ? "Datenschutz" : "Поверителност",
    },
    { href: "/contact", label: isDe ? "Kontakt" : "Контакт" },
  ]

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <nav className="flex flex-wrap gap-6 text-sm font-medium text-muted-foreground">
            {links.map((link) => (
              <Link
                key={link.href}
                href={localizedPath(link.href, locale)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground">
            © 2024-2025 HAMMAL by VZG. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

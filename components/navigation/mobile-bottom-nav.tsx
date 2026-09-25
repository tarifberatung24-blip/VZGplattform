"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, MoreHorizontal } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { LanguageSwitcher } from "@/components/language-switcher"
import { navIcons } from "@/components/navigation/nav-icons"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath, stripLocale } from "@/lib/i18n/routing"
import {
  findDestination,
  isDestinationActive,
  mobilePrimaryIds,
  navGroups,
} from "@/lib/navigation/horizon-nav"

/**
 * Mobile navigation: a fixed bottom bar with four destinations plus a "More" sheet.
 *
 * Rendered inside the workspace shell, which only wraps authenticated routes, so it never appears
 * on the public Layer 0 pages. Destinations and labels come from lib/navigation/horizon-nav.ts.
 * The sidebar drawer remains the full navigation tree for deep links and accessibility.
 */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "/"
  const { locale, t } = useLanguage()
  const active = stripLocale(pathname)
  const [moreOpen, setMoreOpen] = useState(false)

  const primary = mobilePrimaryIds.map(findDestination)
  // "More" holds every destination not promoted to the bar, grouped. Groups with nothing left are
  // dropped so the sheet never shows an empty heading.
  const moreGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !mobilePrimaryIds.includes(item.id)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <>
      <nav
        aria-label={t.mobileNav.more}
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primary.map((item) => {
          const Icon = navIcons[item.id]
          const label = t.navItems[item.labelKey]
          const current = isDestinationActive(active, item.href)
          return (
            <Link
              key={item.id}
              href={localizedPath(item.href, locale)}
              aria-current={current ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors ${
                current ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors ${
            moreOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
          <span className="truncate">{t.mobileNav.more}</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80svh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>{t.mobileNav.more}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-1">
            {moreGroups.map((group) => (
              <div key={group.id} className="flex flex-col gap-1">
                <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {t.navGroups[group.labelKey]}
                </p>
                {group.items.map((item) => {
                  const Icon = navIcons[item.id]
                  const label = t.navItems[item.labelKey]
                  const current = isDestinationActive(active, item.href)
                  return (
                    <Link
                      key={item.id}
                      href={localizedPath(item.href, locale)}
                      onClick={() => setMoreOpen(false)}
                      aria-current={current ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-md px-2 py-3 text-sm font-medium transition-colors ${
                        current ? "bg-primary/5 text-primary" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t.mobileNav.app}
              </p>
              <div className="px-2">
                <LanguageSwitcher />
              </div>
              <form action="/auth/logout" method="post" className="px-2">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <LogOut className="size-5 shrink-0" aria-hidden="true" />
                  <span>{locale === "de" ? "Abmelden" : "Изход"}</span>
                </button>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

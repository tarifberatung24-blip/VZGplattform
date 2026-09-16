"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath, stripLocale } from "@/lib/i18n/routing"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Receipt,
  Landmark,
  Mail,
  FileText,
  Settings,
  LogOut,
} from "lucide-react"

const navItems = [
  {
    href: "/dashboard",
    labelBg: "Преглед",
    labelDe: "Übersicht",
    icon: LayoutDashboard,
  },
  {
    href: "/steuer",
    labelBg: "Данъци",
    labelDe: "Steuern",
    icon: Receipt,
  },
  {
    href: "/anspruch",
    labelBg: "Помощи",
    labelDe: "Hilfen",
    icon: Landmark,
  },
  {
    href: "/email-generator",
    labelBg: "Електронна поща",
    labelDe: "E-Mail",
    icon: Mail,
  },
  {
    href: "/documents",
    labelBg: "Документи",
    labelDe: "Dokumente",
    icon: FileText,
  },
  {
    href: "/settings",
    labelBg: "Настройки",
    labelDe: "Einstellungen",
    icon: Settings,
  },
]

export function UserSidebar() {
  const pathname = usePathname() ?? "/"
  const { locale } = useLanguage()
  const active = stripLocale(pathname)

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-px overflow-y-auto rounded-md border border-border bg-background p-2 lg:flex">
      <nav className="flex flex-col gap-px" aria-label={locale === "de" ? "Hauptnavigation" : "Основна навигация"}>
        {navItems.map((item) => {
          const isActive =
            active === item.href || active.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={localizedPath(item.href, locale)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/5 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>
                {locale === "de" ? item.labelDe : item.labelBg}
              </span>
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto border-t border-border pt-2">
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{locale === "de" ? "Abmelden" : "Изход"}</span>
          </button>
        </form>
      </div>
    </aside>
  )
}


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
    <aside className="hidden w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-background pr-6 lg:flex">
      <div className="border-b border-border pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">KintexBG</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Private Office</p>
      </div>
      <nav className="flex flex-col gap-1" aria-label={locale === "de" ? "Hauptnavigation" : "Основна навигация"}>
        {navItems.map((item) => {
          const isActive =
            active === item.href || active.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={localizedPath(item.href, locale)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 border-l-2 px-3 py-3 text-sm font-bold transition-colors",
                isActive
                  ? "border-primary bg-secondary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
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
      <div className="mt-auto border-t border-border pt-4">
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-3 text-sm font-bold text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{locale === "de" ? "Abmelden" : "Изход"}</span>
          </button>
        </form>
      </div>
    </aside>
  )
}


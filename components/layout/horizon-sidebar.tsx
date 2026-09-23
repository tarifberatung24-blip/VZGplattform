"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Compass,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Mail,
  Receipt,
  Settings,
  WalletCards,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath, stripLocale } from "@/lib/i18n/routing"

/**
 * The single authenticated navigation model. Every entry maps to a real route
 * that enforces its own access control server-side; this file only decides what
 * the workspace shows. Keep it in step with docs/HORIZON_ROUTE_PRODUCT_MAP.md.
 */
const primaryNav = [
  { href: "/dashboard", bg: "Преглед", de: "Übersicht", icon: LayoutDashboard },
  { href: "/guide", bg: "Водач", de: "Wegweiser", icon: Compass },
  { href: "/vertraege", bg: "Договори", de: "Verträge", icon: WalletCards },
  { href: "/documents", bg: "Документи", de: "Dokumente", icon: FileText },
  { href: "/steuer", bg: "Данъци", de: "Steuern", icon: Receipt },
  { href: "/anspruch", bg: "Помощи", de: "Hilfen", icon: Landmark },
  { href: "/email-generator", bg: "Електронна поща", de: "E-Mail", icon: Mail },
] as const

const accountNav = [
  { href: "/profil", bg: "Профил", de: "Profil", icon: Settings },
] as const

export function HorizonSidebar() {
  const pathname = usePathname() ?? "/"
  const { locale } = useLanguage()
  const active = stripLocale(pathname)
  const de = locale === "de"

  const isActive = (href: string) => active === href || active.startsWith(`${href}/`)

  const renderItem = (item: (typeof primaryNav)[number] | (typeof accountNav)[number]) => {
    const label = de ? item.de : item.bg
    const current = isActive(item.href)
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          isActive={current}
          tooltip={label}
          render={<Link href={localizedPath(item.href, locale)} aria-current={current ? "page" : undefined} />}
        >
          <item.icon aria-hidden="true" />
          <span>{label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon" aria-label={de ? "Hauptnavigation" : "Основна навигация"}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5 group-data-[collapsible=icon]:justify-center">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sm font-black text-sidebar-primary-foreground"
            aria-hidden="true"
          >
            H
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-bold leading-tight">HORIZON by VZG</span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            {de ? "Arbeitsbereich" : "Работно пространство"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{primaryNav.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            {de ? "Konto" : "Профил"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{accountNav.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <form action="/auth/logout" method="post">
              <SidebarMenuButton type="submit" tooltip={de ? "Abmelden" : "Изход"}>
                <LogOut aria-hidden="true" />
                <span>{de ? "Abmelden" : "Изход"}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

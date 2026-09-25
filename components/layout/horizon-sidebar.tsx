"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"

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
import { LogoMark } from "@/components/brand/logo"
import { navIcons } from "@/components/navigation/nav-icons"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath, stripLocale } from "@/lib/i18n/routing"
import { isDestinationActive, navGroups } from "@/lib/navigation/horizon-nav"

/**
 * The authenticated desktop navigation. Both the grouped items and their labels come from
 * lib/navigation/horizon-nav.ts, the single navigation source of truth, which is guarded against
 * public destinations by lib/navigation/horizon-nav.test.ts.
 */
export function HorizonSidebar() {
  const pathname = usePathname() ?? "/"
  const { locale, t } = useLanguage()
  const active = stripLocale(pathname)
  const de = locale === "de"

  return (
    <Sidebar collapsible="icon" aria-label={de ? "Hauptnavigation" : "Основна навигация"}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5 group-data-[collapsible=icon]:justify-center">
          <LogoMark className="shrink-0" />
          <span className="min-w-0 truncate text-sm font-bold leading-tight group-data-[collapsible=icon]:hidden">
            HORIZON by VZG
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
              {t.navGroups[group.labelKey]}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = navIcons[item.id]
                  const label = t.navItems[item.labelKey]
                  const current = isDestinationActive(active, item.href)
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={current}
                        tooltip={label}
                        render={
                          <Link
                            href={localizedPath(item.href, locale)}
                            aria-current={current ? "page" : undefined}
                          />
                        }
                      >
                        <Icon aria-hidden="true" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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

"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Cookie,
  Globe2,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react"

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
import { openCookieSettings } from "@/lib/cookies/consent"
import {
  findDestination,
  isDestinationActive,
  mobilePrimaryIds,
  navDestinations,
} from "@/lib/navigation/horizon-nav"

export type MobileWorkspacePanel = "closed" | "menu" | "settings"

type MobileBottomNavProps = {
  panel: MobileWorkspacePanel
  onPanelChange: (panel: MobileWorkspacePanel) => void
}

function menuCopy(de: boolean) {
  return de
    ? {
        menu: "HORIZON Menü",
        profile: "Dein Profil",
        profileHint: "Persönliche Angaben und Finanzprofil",
        quick: "Schnellzugriff",
        settings: "Einstellungen & Privatsphäre",
        settingsHint: "Konto, Sicherheit und Datenschutz",
        account: "Dein Konto",
        accountHint: "Profil, Sicherheit und Zugriff verwalten",
        security: "Passwort und Sicherheit",
        securityHint: "Zusätzlichen Schutz beim Login verwalten",
        privacy: "Cookie-Einstellungen",
        privacyHint: "Datenschutz und optionale Dienste verwalten",
        preferences: "Einstellungen",
        language: "Sprache",
        resources: "Hilfe und Ressourcen",
        education: "Finanzbildung",
        educationHint: "Grundlagen in deinem Tempo lernen",
        search: "Einstellungen durchsuchen",
        noResults: "Keine passende Einstellung gefunden.",
        close: "Schließen",
        back: "Zurück zum Menü",
      }
    : {
        menu: "HORIZON меню",
        profile: "Твоят профил",
        profileHint: "Лични данни и финансов профил",
        quick: "Бърз достъп",
        settings: "Настройки и поверителност",
        settingsHint: "Акаунт, сигурност и лични данни",
        account: "Твоят акаунт",
        accountHint: "Управлявай профил, сигурност и достъп",
        security: "Парола и сигурност",
        securityHint: "Управлявай допълнителната защита при вход",
        privacy: "Настройки за бисквитки",
        privacyHint: "Управлявай поверителност и допълнителни услуги",
        preferences: "Предпочитания",
        language: "Език",
        resources: "Помощ и ресурси",
        education: "Финансово обучение",
        educationHint: "Научи основите със собствено темпо",
        search: "Търси в настройките",
        noResults: "Няма намерена подходяща настройка.",
        close: "Затвори",
        back: "Назад към менюто",
      }
}

/**
 * Mobile navigation: four work destinations and a profile menu. The fifth tab opens a real
 * account menu instead of a generic overflow list, so the phone interface stays easy to scan.
 *
 * Rendered inside the workspace shell, which only wraps authenticated routes, so it never appears
 * on the public Layer 0 pages. Destinations and labels come from lib/navigation/horizon-nav.ts.
 * Every visible action either opens an existing workspace route or the cookie settings already
 * provided by the product. No placeholder mobile modules are introduced here.
 */
export function MobileBottomNav({ panel, onPanelChange }: MobileBottomNavProps) {
  const pathname = usePathname() ?? "/"
  const { locale, t } = useLanguage()
  const active = stripLocale(pathname)
  const [settingsQuery, setSettingsQuery] = useState("")
  const de = locale === "de"
  const copy = menuCopy(de)

  const primary = mobilePrimaryIds.map(findDestination)
  const quickIds = ["guide", "documents", "inkasso", "forum"] as const
  const quick = quickIds.map(findDestination)
  const menuItems = navDestinations.filter((item) => item.id !== "dashboard" && item.id !== "security")
  const settingsItems = [
    { id: "profile", title: copy.account, detail: copy.accountHint, href: localizedPath("/profil", locale), Icon: UserRound },
    { id: "security", title: copy.security, detail: copy.securityHint, href: localizedPath("/konto/sicherheit", locale), Icon: ShieldCheck },
    { id: "cookies", title: copy.privacy, detail: copy.privacyHint, Icon: Cookie },
    { id: "education", title: copy.education, detail: copy.educationHint, href: localizedPath("/finanzbildung", locale), Icon: BookOpen },
  ]
  const matchingSettings = settingsQuery.trim()
    ? settingsItems.filter((item) => `${item.title} ${item.detail}`.toLocaleLowerCase(locale).includes(settingsQuery.trim().toLocaleLowerCase(locale)))
    : null
  const isOpen = panel !== "closed"

  const closePanel = () => onPanelChange("closed")
  const openCookies = () => {
    closePanel()
    window.setTimeout(openCookieSettings, 0)
  }

  return (
    <>
      <nav
        aria-label={copy.menu}
        className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 mx-auto flex h-[4.25rem] max-w-md items-stretch rounded-[1.4rem] border border-white/10 bg-[#2b2d31]/95 px-1 shadow-[0_16px_36px_rgb(0_0_0_/_0.34)] backdrop-blur-md md:hidden"
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
              className={`m-1 flex min-w-0 flex-1 items-center justify-center rounded-[1rem] px-1 transition-colors ${
                current ? "bg-white/16 text-white" : "text-white/68 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="size-[1.35rem]" aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => onPanelChange("menu")}
          aria-expanded={panel === "menu"}
          aria-label={copy.menu}
          className={`m-1 flex min-w-0 flex-1 items-center justify-center rounded-[1rem] px-1 transition-colors ${
            panel === "menu" ? "bg-white/16 text-white" : "text-white/72 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="grid size-8 place-items-center rounded-full border border-white/20 bg-white/10">
            <UserRound className="size-[1.15rem]" aria-hidden="true" />
          </span>
          <span className="sr-only">{copy.menu}</span>
        </button>
      </nav>

      <Sheet open={isOpen} onOpenChange={(open) => onPanelChange(open ? (panel === "closed" ? "menu" : panel) : "closed")}>
        <SheetContent
          side="bottom"
          className="mobile-workspace-sheet max-h-[calc(100svh-0.75rem)] overflow-y-auto rounded-t-[2rem] border-white/10 p-0 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          {panel === "menu" ? (
            <>
              <SheetHeader className="flex-row items-center justify-between border-b border-white/10 px-5 py-5">
                <SheetTitle className="text-[1.45rem] font-bold tracking-tight text-white">{copy.menu}</SheetTitle>
                <button type="button" onClick={() => onPanelChange("settings")} className="grid size-11 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white" aria-label={copy.settings}>
                  <Settings className="size-6" aria-hidden="true" />
                </button>
              </SheetHeader>

              <div className="space-y-5 px-4 py-4">
                <Link href={localizedPath("/profil", locale)} onClick={closePanel} className="mobile-menu-profile">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/12 text-white"><UserRound className="size-6" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-base font-bold text-white">{copy.profile}</span><span className="mt-0.5 block text-sm text-white/62">{copy.profileHint}</span></span>
                  <ChevronRight className="size-5 text-white/62" aria-hidden="true" />
                </Link>

                <section aria-labelledby="mobile-quick-title">
                  <h2 id="mobile-quick-title" className="px-1 text-base font-bold text-white">{copy.quick}</h2>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {quick.map((item) => {
                      const Icon = navIcons[item.id]
                      const label = t.navItems[item.labelKey]
                      return <Link key={item.id} href={localizedPath(item.href, locale)} onClick={closePanel} className="mobile-menu-quick">
                        <Icon className="size-5" aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    })}
                  </div>
                </section>

                <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.06]">
                  {menuItems.map((item) => {
                  const Icon = navIcons[item.id]
                  const label = t.navItems[item.labelKey]
                  const current = isDestinationActive(active, item.href)
                  return (
                    <Link
                      key={item.id}
                      href={localizedPath(item.href, locale)}
                        onClick={closePanel}
                      aria-current={current ? "page" : undefined}
                        className={`mobile-menu-row ${
                          current ? "bg-white/10 text-white" : "text-white/90 hover:bg-white/8"
                      }`}
                    >
                        <Icon className="size-5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        <ChevronRight className="size-4 text-white/45" aria-hidden="true" />
                    </Link>
                  )
                })}
                </div>

                <button type="button" onClick={() => onPanelChange("settings")} className="mobile-menu-settings">
                  <Settings className="size-5" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-left"><span className="block font-semibold">{copy.settings}</span><span className="mt-0.5 block text-sm font-normal text-white/62">{copy.settingsHint}</span></span>
                  <ChevronRight className="size-5 text-white/55" aria-hidden="true" />
                </button>

                <form action="/auth/logout" method="post">
                  <button type="submit" className="mobile-menu-signout">
                    <LogOut className="size-5" aria-hidden="true" />
                    <span>{de ? "Abmelden" : "Изход"}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <SheetHeader className="flex-row items-center gap-2 border-b border-white/10 px-5 py-5">
                <button type="button" onClick={() => onPanelChange("menu")} className="grid size-11 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white" aria-label={copy.back}>
                  <ArrowLeft className="size-6" aria-hidden="true" />
                </button>
                <SheetTitle className="min-w-0 flex-1 text-[1.3rem] font-bold tracking-tight text-white">{copy.settings}</SheetTitle>
                <button type="button" onClick={closePanel} className="text-sm font-semibold text-white/68 hover:text-white">{copy.close}</button>
              </SheetHeader>

              <div className="space-y-6 px-5 py-5">
                <label className="mobile-settings-search">
                  <Search className="size-5" aria-hidden="true" />
                  <input value={settingsQuery} onChange={(event) => setSettingsQuery(event.target.value)} placeholder={copy.search} />
                </label>

                {matchingSettings ? (
                  matchingSettings.length ? <section aria-labelledby="mobile-search-results-title"><h2 id="mobile-search-results-title" className="mobile-settings-heading">{copy.search}</h2><div className="mt-2 overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.06]">{matchingSettings.map(({ id, title, detail, href, Icon }) => href ? <Link key={id} href={href} onClick={closePanel} className="mobile-settings-row"><Icon className="size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="mt-0.5 block text-sm font-normal text-white/62">{detail}</span></span><ChevronRight className="size-4 text-white/45" aria-hidden="true" /></Link> : <button key={id} type="button" onClick={openCookies} className="mobile-settings-row w-full text-left"><Icon className="size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="mt-0.5 block text-sm font-normal text-white/62">{detail}</span></span><ChevronRight className="size-4 text-white/45" aria-hidden="true" /></button>)}</div></section> : <p className="text-center text-sm text-white/62">{copy.noResults}</p>
                ) : <>
                  <section aria-labelledby="mobile-account-title">
                    <h2 id="mobile-account-title" className="mobile-settings-heading">{copy.account}</h2>
                    <div className="mt-2 overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.06]">
                      {settingsItems.slice(0, 2).map(({ id, title, detail, href, Icon }) => <Link key={id} href={href!} onClick={closePanel} className="mobile-settings-row"><Icon className="size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="mt-0.5 block text-sm font-normal text-white/62">{detail}</span></span><ChevronRight className="size-4 text-white/45" aria-hidden="true" /></Link>)}
                    </div>
                  </section>

                  <section aria-labelledby="mobile-preferences-title">
                    <h2 id="mobile-preferences-title" className="mobile-settings-heading">{copy.preferences}</h2>
                    <div className="mt-2 overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.06]">
                      <div className="mobile-settings-row"><Globe2 className="size-5 shrink-0" aria-hidden="true" /><span className="flex-1 font-semibold">{copy.language}</span><LanguageSwitcher className="shrink-0" /></div>
                      <button type="button" onClick={openCookies} className="mobile-settings-row w-full text-left"><Cookie className="size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block font-semibold">{copy.privacy}</span><span className="mt-0.5 block text-sm font-normal text-white/62">{copy.privacyHint}</span></span><ChevronRight className="size-4 text-white/45" aria-hidden="true" /></button>
                    </div>
                  </section>

                  <section aria-labelledby="mobile-resources-title">
                    <h2 id="mobile-resources-title" className="mobile-settings-heading">{copy.resources}</h2>
                    <div className="mt-2 overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.06]">
                      {settingsItems.slice(3).map(({ id, title, detail, href, Icon }) => <Link key={id} href={href!} onClick={closePanel} className="mobile-settings-row"><Icon className="size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="mt-0.5 block text-sm font-normal text-white/62">{detail}</span></span><ChevronRight className="size-4 text-white/45" aria-hidden="true" /></Link>)}
                    </div>
                  </section>
                </>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

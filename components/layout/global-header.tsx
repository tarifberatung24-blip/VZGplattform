"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { AiSearch } from "@/components/search/ai-search"
import { localizedPath, stripLocale } from "@/lib/i18n/routing"
import { isKintexWorkspacePath, isSelfChromedPath } from "@/lib/kintex-navigation"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { authenticatedHomePath } from "@/lib/supabase/auth-routing"

/**
 * The public Layer 0 header.
 *
 * One trigger ("Меню" / "Menü") holds every public destination, so the bar stays
 * a brand, a search field and one menu instead of a row of links that is hard to
 * scan and worse on a phone. The dropdown lists the same destinations the mobile
 * sheet does, so the two widths cannot drift.
 */
export function GlobalHeader() {
  const pathname = usePathname() ?? "/"
  const locale = pathname.startsWith("/de") ? "de" : "bg"
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch {
      setSessionReady(true)
      return
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSessionActive(Boolean(data.session))
      setSessionReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessionActive(Boolean(session))
        setSessionReady(true)
      }
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  // Authenticated workspace routes render the HORIZON shell (see WorkspaceShell).
  // The public Layer 0 header must not appear inside the operational workspace.
  // `/office` is not behind the workspace shell but renders its own header, so it
  // must not receive this one either — otherwise the page shows two stacked headers.
  if (isKintexWorkspacePath(pathname) || isSelfChromedPath(pathname)) return null

  const labels =
    locale === "de"
      ? {
          home: "Startseite",
          howItWorks: "So funktioniert's",
          ratgeber: "Ratgeber",
          vorlagen: "Vorlagen",
          forum: "HORIZON Forum",
          security: "Sicherheit",
          contact: "Kontakt",
          login: "Anmelden",
          register: "Registrieren",
          dashboard: "Mein Dashboard",
          menu: "Menü",
          close: "Menü schließen",
        }
      : {
          home: "Начало",
          howItWorks: "Как работи",
          ratgeber: "Наръчник",
          vorlagen: "Готови писма",
          forum: "HORIZON Forum",
          security: "Сигурност",
          contact: "Контакт",
          login: "Вход",
          register: "Регистрация",
          dashboard: "Моето табло",
          menu: "Меню",
          close: "Затвори менюто",
        }

  const isActivePath = (href: string) => {
    const clean = stripLocale(pathname)
    return clean === href || clean.startsWith(href + "/")
  }

  const closeMobile = () => setMobileOpen(false)
  const homeHref =
    sessionReady && sessionActive
      ? authenticatedHomePath(locale)
      : localizedPath("/", locale)

  const navLinks: { href: string; labelKey: keyof typeof labels }[] = [
    { href: "/how-it-works", labelKey: "howItWorks" },
    { href: "/ratgeber", labelKey: "ratgeber" },
    { href: "/vorlagen", labelKey: "vorlagen" },
    { href: "/forum", labelKey: "forum" },
    { href: "/security", labelKey: "security" },
    { href: "/contact", labelKey: "contact" },
  ]

  return (
    <header className="glass-chrome sticky top-0 z-40 border-b backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-2 px-3 sm:gap-6 sm:px-5 lg:px-8">
        <Link href={homeHref} className="flex shrink-0 items-center" aria-label="HORIZON by VZG">
          {/* The supplied mark is monochrome and painted with the theme colour
              via .logo-mask, so it stays legible in both themes. */}
          <span className="logo-mask h-6 w-auto text-foreground sm:h-8" />
        </Link>

        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
                />
              }
            >
              <Menu className="size-4" aria-hidden="true" />
              {labels.menu}
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{labels.menu}</DropdownMenuLabel>
                <DropdownMenuItem
                  render={
                    <Link
                      href={homeHref}
                      className={cn("flex w-full items-center gap-2", isActivePath("/") ? "font-semibold" : "")}
                    />
                  }
                >
                  {labels.home}
                </DropdownMenuItem>
                {navLinks.map((link) => (
                  <DropdownMenuItem
                    key={link.href}
                    render={
                      <Link
                        href={localizedPath(link.href, locale)}
                        className={cn("flex w-full items-center gap-2", isActivePath(link.href) ? "font-semibold" : "")}
                      />
                    }
                  >
                    {labels[link.labelKey]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {sessionReady && sessionActive ? (
                <DropdownMenuItem
                  render={<Link href={localizedPath("/dashboard", locale)} className="flex w-full items-center gap-2" />}
                >
                  {labels.dashboard}
                  <ArrowRight className="ml-auto size-4" aria-hidden="true" />
                </DropdownMenuItem>
              ) : sessionReady ? (
                <>
                  <DropdownMenuItem
                    render={<Link href={localizedPath("/auth/login", locale)} className="flex w-full items-center gap-2" />}
                  >
                    {labels.login}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href={localizedPath("/auth/sign-up", locale)} className="flex w-full items-center gap-2" />}
                  >
                    {labels.register}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <AiSearch className="hidden sm:inline-flex" />
          {/* Both switchers drop into the mobile menu below `sm`: at 390px the
              brand, a switcher, the register CTA and the menu button already
              exceed the viewport and clip the menu button. */}
          <ThemeToggle
            className="hidden sm:inline-flex"
            labels={{ light: locale === "de" ? "Helles Design" : "Светла тема", dark: locale === "de" ? "Dunkles Design" : "Тъмна тема" }}
          />
          <LanguageSwitcher className="hidden shrink-0 sm:inline-flex" />
          {sessionReady && sessionActive ? (
            <Button
              asChild
              variant="default"
              size="sm"
              className="hidden rounded-md shadow-none sm:inline-flex"
            >
              <Link href={localizedPath("/dashboard", locale)}>
                {labels.dashboard}
              </Link>
            </Button>
          ) : sessionReady ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden rounded-md lg:inline-flex"
              >
                <Link href={localizedPath("/auth/login", locale)}>
                  {labels.login}
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-md bg-primary px-4 text-primary-foreground shadow-none hover:bg-primary/90 sm:px-5"
              >
                <Link href={localizedPath("/auth/sign-up", locale)}>
                  {labels.register}
                </Link>
              </Button>
            </>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-sm md:hidden"
            aria-label={mobileOpen ? labels.close : labels.menu}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="glass-chrome border-t backdrop-blur-xl backdrop-saturate-150 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            <AiSearch className="mb-2 w-full justify-center" />
            <Link
              href={homeHref}
              onClick={closeMobile}
              className={cn(
                "rounded-sm px-3 py-3 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground",
                isActivePath("/") ? "text-foreground" : ""
              )}
            >
              {labels.home}
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={localizedPath(link.href, locale)}
                onClick={closeMobile}
                className="rounded-sm px-3 py-3 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                {labels[link.labelKey]}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {/* The header switchers are hidden below `sm`, so both are repeated
                  here to keep language and theme reachable on mobile. */}
              <div className="flex items-center gap-2 px-1 pb-1 sm:hidden">
                <LanguageSwitcher />
                <ThemeToggle
                  labels={{ light: locale === "de" ? "Helles Design" : "Светла тема", dark: locale === "de" ? "Dunkles Design" : "Тъмна тема" }}
                />
              </div>
              {sessionActive ? (
                <Button
                  asChild
                  variant="default"
                  className="w-full rounded-md shadow-none"
                  size="lg"
                >
                  <Link
                    href={localizedPath("/dashboard", locale)}
                    onClick={closeMobile}
                  >
                    {labels.dashboard}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full rounded-md"
                    onClick={closeMobile}
                  >
                    <Link href={localizedPath("/auth/login", locale)}>
                      {labels.login}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="w-full rounded-md bg-primary text-primary-foreground shadow-none"
                    onClick={closeMobile}
                  >
                    <Link href={localizedPath("/auth/sign-up", locale)}>
                      {labels.register}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

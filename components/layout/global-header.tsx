"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { localizedPath, stripLocale } from "@/lib/i18n/routing"
import { isKintexWorkspacePath, isSelfChromedPath } from "@/lib/kintex-navigation"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { authenticatedHomePath } from "@/lib/supabase/auth-routing"

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
          functions: "Funktionen",
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
          functions: "Функции",
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
    { href: "/functions", labelKey: "functions" },
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

        <nav className="hidden items-center gap-0.5 lg:flex xl:gap-1">
          <Link
            href={homeHref}
            aria-current={isActivePath("/") ? "page" : undefined}
            className={cn(
              "hidden px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground xl:block xl:px-4",
              isActivePath("/") ? "text-foreground" : ""
            )}
          >
            {labels.home}
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={localizedPath(link.href, locale)}
              className={cn(
                "px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground xl:px-4",
                isActivePath(link.href) ? "text-foreground" : ""
              )}
            >
              {labels[link.labelKey]}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-2">
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
              className="hidden shadow-none sm:inline-flex"
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
                className="hidden lg:inline-flex"
              >
                <Link href={localizedPath("/auth/login", locale)}>
                  {labels.login}
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-primary text-primary-foreground shadow-none"
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
            className="md:hidden"
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
            <Link
              href={homeHref}
              onClick={closeMobile}
              aria-current={isActivePath("/") ? "page" : undefined}
              className={cn(
                "rounded-[var(--control-radius,0.1875rem)] px-3 py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
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
                className="rounded-[var(--control-radius,0.1875rem)] px-3 py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
                  className="w-full shadow-none"
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
                    className="w-full"
                    onClick={closeMobile}
                  >
                    <Link href={localizedPath("/auth/login", locale)}>
                      {labels.login}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-primary text-primary-foreground shadow-none"
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

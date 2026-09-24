"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { localizedPath, stripLocale } from "@/lib/i18n/routing"
import { isKintexWorkspacePath } from "@/lib/kintex-navigation"
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
  if (isKintexWorkspacePath(pathname)) return null

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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-none">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-6 px-5 lg:px-8">
        <Link
          href={homeHref}
          className="flex items-baseline gap-3 text-2xl font-black tracking-[-0.04em] text-foreground"
        >
          HORIZON by VZG
          {/* Redundant lockup below `sm`: at 390px the brand plus the auth
              controls exceed the viewport and clip the menu button. The suffix
              is decorative, so it is the safe thing to drop on small screens. */}
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            by VZG CONSULT
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href={homeHref}
            className={cn(
              "px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground",
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
                "px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground",
                isActivePath(link.href) ? "text-foreground" : ""
              )}
            >
              {labels[link.labelKey]}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {sessionReady && sessionActive ? (
            <Button
              asChild
              variant="default"
              size="sm"
              className="rounded-md shadow-none"
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
                className="hidden rounded-md md:inline-flex"
              >
                <Link href={localizedPath("/auth/login", locale)}>
                  {labels.login}
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-md bg-primary px-5 text-primary-foreground shadow-none hover:bg-primary/90"
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
        <div className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
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

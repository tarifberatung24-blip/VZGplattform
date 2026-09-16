"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath, stripLocale } from "@/lib/i18n/routing"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

export function GlobalHeader() {
  const { locale } = useLanguage()
  const pathname = usePathname() ?? "/"
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const supabase = createClient()
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

  const labels =
    locale === "de"
      ? {
          home: "Startseite",
          howItWorks: "So funktioniert's",
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

  const navLinks: { href: string; labelKey: keyof typeof labels }[] = [
    { href: "/how-it-works", labelKey: "howItWorks" },
    { href: "/contact", labelKey: "contact" },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-8">
        <Link
          href={localizedPath("/", locale)}
          className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground"
        >
          HAMMAL
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            by VZG
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href={localizedPath("/", locale)}
            className={cn(
              "px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
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
                "px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                isActivePath(link.href) ? "text-foreground" : ""
              )}
            >
              {labels[link.labelKey]}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
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
            className="rounded-md md:hidden"
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
              href={localizedPath("/", locale)}
              onClick={closeMobile}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
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
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Menu, X } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/lib/i18n/language-context"
import { cn } from "@/lib/utils"
import { openPwaInstallPrompt } from "@/components/pwa-install-prompt"

export function SiteHeader() {
  const { t, locale } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => { setAuthenticated(Boolean(data.user)); setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)))
    return () => listener.subscription.unsubscribe()
  }, [])

  const labels = locale === "de"
    ? { home: "Startseite", services: "Leistungen", taxes: "Steuern", benefits: "Staatliche Hilfen", tariffs: "Tarife", documents: "Dokumente", about: "Über KintexBG", profile: "Persönlicher Bereich", logout: "Abmelden", install: "App installieren", menu: "Menü" }
    : { home: "Начало", services: "Услуги", taxes: "Данъци", benefits: "Държавни помощи", tariffs: "Тарифи", documents: "Документи", about: "За KintexBG", profile: "Личен профил", logout: "Изход", install: "Инсталирай приложението", menu: "Меню" }
  const links = [
    { href: "/", label: labels.home },
    { href: "/uslugi", label: labels.services },
    { href: "/kindergeld", label: "Kindergeld" },
    { href: "/steuer", label: labels.taxes },
    { href: "/anspruch", label: labels.benefits },
    { href: "/tarife", label: labels.tariffs },
    { href: "/documents", label: labels.documents },
    { href: "/za-nas", label: labels.about },
  ]
  const localizedHref = (href: string) => href === "/" ? `/${locale}` : `/${locale}${href}`
  const closeMenu = () => setOpen(false)
  async function logout() { await createClient().auth.signOut(); closeMenu(); router.push("/") }

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-8">
        <Link href="/" aria-label="KintexBG — BY VZG" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.slice(0, 4).map((l) => (
            <Link
              key={l.href}
              href={localizedHref(l.href)}
              className="rounded-full px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {authReady && authenticated ? (
            <>
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex"><Link href="/protected">{labels.profile}</Link></Button>
              <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={logout}>{labels.logout}</Button>
            </>
          ) : authReady ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex"><Link href="/auth/login">{t.nav.login}</Link></Button>
              <Button asChild size="sm" className="hidden rounded-full bg-foreground px-5 text-background hover:bg-foreground/90 md:inline-flex"><Link href="/auth/sign-up">{t.nav.register}</Link></Button>
            </>
          ) : null}

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground md:hidden"
            aria-label={labels.menu}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className={cn("border-t border-border bg-background md:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={localizedHref(l.href)}
              onClick={closeMenu}
              className="rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" size="sm" className="justify-start" onClick={openPwaInstallPrompt}>{labels.install}</Button>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
            </div>
            <div className="flex gap-2">
              {authReady && authenticated ? (
                <>
                  <Button asChild variant="outline" size="sm"><Link href="/protected" onClick={closeMenu}>{labels.profile}</Link></Button>
                  <Button variant="outline" size="sm" onClick={logout}>{labels.logout}</Button>
                </>
              ) : authReady ? (
                <>
                  <Button asChild variant="outline" size="sm"><Link href="/auth/login" onClick={closeMenu}>{t.nav.login}</Link></Button>
                  <Button asChild size="sm"><Link href="/auth/sign-up" onClick={closeMenu}>{t.nav.register}</Link></Button>
                </>
              ) : null}
            </div>
          </div>
        </nav>
      </div>
    </header>
    </>
  )
}

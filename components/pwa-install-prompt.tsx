"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, ExternalLink, X } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { Button } from "@/components/ui/button"

const DISMISSED_KEY = "finanzbg:pwa-install-dismissed"
const OPEN_EVENT = "finanzbg:open-install"

type DeferredPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

type InstallMode = "android" | "ios" | "browser" | "installed"

function getMode(): InstallMode {
  if (typeof window === "undefined") return "browser"
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return "installed"
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return "ios"
  if (/android/.test(ua)) return "android"
  return "browser"
}

export function PwaInstallPrompt() {
  const { locale } = useLanguage()
  const router = useRouter()
  const [prompt, setPrompt] = useState<DeferredPrompt | null>(null)
  const [visible, setVisible] = useState(false)
  const [mode, setMode] = useState<InstallMode>("browser")
  const [isStandalone, setIsStandalone] = useState(false)
  const de = locale === "de"

  useEffect(() => {
    const currentMode = getMode()
    setMode(currentMode)
    setIsStandalone(currentMode === "installed")
    const shouldShow = () => !localStorage.getItem(DISMISSED_KEY) && getMode() !== "installed"
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPrompt(event as DeferredPrompt)
      if (shouldShow()) setVisible(true)
    }
    const onOpen = () => {
      if (shouldShow()) setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [])

  if (isStandalone || !visible) return null

  const copy = de ? {
    title: "KintexBG installieren",
    android: "Installiere die App über den Installieren-Button oder das Browser-Menü.",
    ios: "Tippe in Safari auf Teilen und dann auf Zum Home-Bildschirm.",
    browser: "Öffne die Browser-Menüoption Installieren oder Zum Startbildschirm hinzufügen.",
    action: "Installieren", later: "Später", help: "Installationshilfe",
  } : {
    title: "Инсталирай KintexBG",
    android: "Използвай бутона за инсталиране или менюто на браузъра.",
    ios: "В Safari натисни Споделяне и после Добави към началния екран.",
    browser: "Отвори менюто на браузъра и избери Инсталиране или Добави към началния екран.",
    action: "Инсталирай", later: "По-късно", help: "Помощ за инсталиране",
  }
  const dismiss = () => { localStorage.setItem(DISMISSED_KEY, "1"); setVisible(false) }
  const install = async () => {
    if (prompt) {
      await prompt.prompt()
      await prompt.userChoice
      setPrompt(null)
    } else {
      router.push(`/${locale}/app`)
    }
    setVisible(false)
  }
  const message = mode === "ios" ? copy.ios : mode === "android" && prompt ? copy.android : copy.browser

  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg sm:inset-x-auto sm:right-4 sm:left-auto">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Download className="size-5" aria-hidden="true" /></div>
        <div className="min-w-0 flex-1"><p className="font-semibold">{copy.title}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{message}</p></div>
        <Button size="icon" variant="ghost" onClick={dismiss} aria-label={copy.later}><X className="size-4" /></Button>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => { router.push(`/${locale}/app`) }}><ExternalLink className="mr-1.5 size-3.5" />{copy.help}</Button>
        {mode !== "ios" && <Button size="sm" onClick={install}>{copy.action}</Button>}
      </div>
    </aside>
  )
}

export function openPwaInstallPrompt() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

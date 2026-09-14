import type {Metadata} from "next"
import {NextIntlClientProvider} from "next-intl"
import {getMessages, setRequestLocale} from "next-intl/server"
import {notFound} from "next/navigation"
import {routing, type Locale} from "@/i18n/routing"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}))
}

const localeMetadata: Record<Locale, {title: string; description: string; keywords: string[]}> = {
  bg: {
    title: "KintexBG — BY VZG CONSULT",
    description: "Финансовият и административен помощник за живота ти в Германия.",
    keywords: ["данъци Германия", "Kindergeld", "договори Германия", "българи в Германия"],
  },
  de: {
    title: "KintexBG — BY VZG CONSULT",
    description: "Dein Finanz- und Verwaltungsassistent für das Leben in Deutschland.",
    keywords: ["Steuererklärung Deutschland", "Kindergeld", "Verträge Deutschland", "Finanzassistent"],
  },
}

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params
  if (!routing.locales.includes(locale as Locale)) return {}
  const content = localeMetadata[locale as Locale]
  return {
    title: content.title,
    description: content.description,
    keywords: content.keywords,
    alternates: {
      languages: {
        bg: "/bg",
        de: "/de",
      },
    },
    openGraph: {
      title: content.title,
      description: content.description,
      locale: locale === "de" ? "de_DE" : "bg_BG",
    },
  }
}

export default async function LocaleLayout({children, params}: {children: React.ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params
  if (!routing.locales.includes(locale as Locale)) notFound()
  setRequestLocale(locale as Locale)
  const messages = await getMessages()
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
}

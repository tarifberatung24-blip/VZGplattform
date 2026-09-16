import {NextIntlClientProvider} from "next-intl"
import {getMessages, setRequestLocale} from "next-intl/server"
import {notFound} from "next/navigation"
import {routing, type Locale} from "@/i18n/routing"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}))
}

export default async function LocaleLayout({children, params}: {children: React.ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params
  if (!routing.locales.includes(locale as Locale)) notFound()
  setRequestLocale(locale as Locale)
  const messages = await getMessages()
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
}

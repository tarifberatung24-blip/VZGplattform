import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { LOCALE_COOKIE_KEY, defaultLocale, isLocale } from "@/lib/i18n/routing"
import ContactPage from "@/app/[locale]/contact/page"

export default async function ContactEntrypointPage() {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_KEY)?.value
  const locale = isLocale(cookieLocale ?? "") ? cookieLocale : defaultLocale

  if (locale === defaultLocale) {
    redirect(`/${locale}/contact`)
  }

  return <ContactPage />
}

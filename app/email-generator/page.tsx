import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import {
  LOCALE_COOKIE_KEY,
  defaultLocale,
  isLocale,
} from "@/lib/i18n/routing"
export default async function EmailGeneratorEntrypointPage() {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_KEY)?.value
  const locale = isLocale(cookieLocale ?? "") ? cookieLocale : defaultLocale

  redirect(`/${locale}/email-generator`)
}

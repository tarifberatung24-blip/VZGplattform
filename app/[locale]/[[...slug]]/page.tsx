import {notFound, redirect} from "next/navigation"
import { isKintexWorkspacePath } from "@/lib/kintex-navigation"
import HomePage from "@/app/page"
import CheckPage from "@/app/check/page"
import UslugiPage from "@/app/uslugi/page"
import AnspruchPage from "@/app/anspruch/page"
import KindergeldPage from "@/app/kindergeld/page"
import ProduktePage from "@/app/produkte/page"
import TarifePage from "@/app/tarife/page"
import VertraegePage from "@/app/vertraege/page"
import DocumentsPage from "@/app/documents/page"
import ZaNasPage from "@/app/za-nas/page"
import LoginPage from "@/app/auth/login/page"
import SignUpPage from "@/app/auth/sign-up/page"
import SignUpSuccessPage from "@/app/auth/sign-up-success/page"
import AuthErrorPage from "@/app/auth/error/page"
import ForgotPasswordPage from "@/app/auth/forgot-password/page"
import UpdatePasswordPage from "@/app/auth/update-password/page"
import MfaVerifyPage from "@/app/auth/mfa-verify/page"
import FinanzamtPage from "@/app/finanzamt/page"
import ProfilPage from "@/app/profil/page"
import ProtectedPage from "@/app/protected/page"
import HomeOfficePage from "@/app/protected/home-office/page"
import SecurityPage from "@/app/protected/security/page"
import SteuerPage from "@/app/steuer/page"
import ProvidersPage from "@/app/steuer/providers/page"
import ReviewPage from "@/app/steuer/review/page"
import DatenschutzPage from "@/app/datenschutz/page"
import AgbPage from "@/app/agb/page"
import ImpressumPage from "@/app/impressum/page"
import ContactPage from "@/app/[locale]/contact/page"
import AffiliateNoticePage from "@/app/affiliate-hinweis/page"
import WithdrawalPage from "@/app/widerruf/page"
import AppInstallPage from "@/app/app/page"
import FinanzbildungPage from "@/app/finanzbildung/page"
import EmailGeneratorPage from "@/app/[locale]/email-generator/page"
import HowItWorksPage from "@/app/[locale]/how-it-works/page"
import { FunctionsPage } from "@/components/marketing/public-layer-page"
import type { Locale } from "@/lib/i18n/dictionaries"
import { hasSupabaseConfig } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"

/**
 * Onboarding outlet for the localized catch-all. The four real step pages live
 * at /{locale}/onboarding/{step} and take precedence, so this only sees the bare
 * /onboarding path or an unknown step. It resolves the user's actual step and
 * redirects there rather than rendering a duplicate step with no session user,
 * so every onboarding step has exactly one renderer.
 */
async function OnboardingOutlet({ locale }: { locale: string; step?: string }): Promise<never> {
  const { onboardingStepDestination } = await import("@/lib/onboarding/guard")
  return redirect(await onboardingStepDestination(locale))
}

const pages: Record<string, React.ComponentType> = {
  "": HomePage, check: CheckPage, uslugi: UslugiPage, anspruch: AnspruchPage, kindergeld: KindergeldPage,
  produkte: ProduktePage, tarife: TarifePage, vertraege: VertraegePage, documents: DocumentsPage, "za-nas": ZaNasPage,
  "auth/login": LoginPage, "auth/sign-up": SignUpPage, "auth/sign-up-success": SignUpSuccessPage, "auth/error": AuthErrorPage,
  "auth/forgot-password": ForgotPasswordPage, "auth/update-password": UpdatePasswordPage, "auth/mfa-verify": MfaVerifyPage,
  finanzamt: FinanzamtPage, profil: ProfilPage, dashboard: ProtectedPage, protected: ProtectedPage, assistant: HomeOfficePage, "protected/home-office": HomeOfficePage, "protected/security": SecurityPage,
  steuer: SteuerPage, "steuer/providers": ProvidersPage, "steuer/review": ReviewPage, finanzbildung: FinanzbildungPage, datenschutz: DatenschutzPage, agb: AgbPage, impressum: ImpressumPage, contact: ContactPage, emailGenerator: EmailGeneratorPage, "how-it-works": HowItWorksPage, "affiliate-hinweis": AffiliateNoticePage, widerruf: WithdrawalPage, app: AppInstallPage,
}

export async function generateMetadata({params}: {params: Promise<{locale: string; slug?: string[]}>}) {
  const {slug = []} = await params
  return isKintexWorkspacePath(`/${slug.join("/")}`)
    ? { title: { absolute: "HORIZON by VZG — VZG CONSULT" }, description: "HORIZON by VZG — administrative support for life in Germany" }
    : {}
}

export default async function LocalizedPage({params}: {params: Promise<{locale: string; slug?: string[]}>}) {
  const {locale, slug = []} = await params
  if (slug.length === 0 && hasSupabaseConfig()) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect(`/${locale}/dashboard`)
  }
  if (slug.join("/") === "functions") return <FunctionsPage locale={locale as Locale} />
  if (slug.join("/") === "protected") redirect("/dashboard")
  if (slug[0] === "onboarding") return <OnboardingOutlet locale={locale} step={slug[1]} />
  const Page = pages[slug.join("/")]
  if (!Page) notFound()
  return <Page />
}

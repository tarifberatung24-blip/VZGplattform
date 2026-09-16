import {notFound} from "next/navigation"
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
import AppInstallPage from "@/app/app/page"

const pages: Record<string, React.ComponentType> = {
  "": HomePage, check: CheckPage, uslugi: UslugiPage, anspruch: AnspruchPage, kindergeld: KindergeldPage,
  produkte: ProduktePage, tarife: TarifePage, vertraege: VertraegePage, documents: DocumentsPage, "za-nas": ZaNasPage,
  "auth/login": LoginPage, "auth/sign-up": SignUpPage, "auth/sign-up-success": SignUpSuccessPage, "auth/error": AuthErrorPage,
  "auth/forgot-password": ForgotPasswordPage, "auth/update-password": UpdatePasswordPage, "auth/mfa-verify": MfaVerifyPage,
  finanzamt: FinanzamtPage, profil: ProfilPage, protected: ProtectedPage, "protected/home-office": HomeOfficePage, "protected/security": SecurityPage,
  steuer: SteuerPage, "steuer/providers": ProvidersPage, "steuer/review": ReviewPage, datenschutz: DatenschutzPage, agb: AgbPage, app: AppInstallPage,
}

export async function generateMetadata({params}: {params: Promise<{locale: string; slug?: string[]}>}) {
  const {slug = []} = await params
  return isKintexWorkspacePath(`/${slug.join("/")}`)
    ? { title: { absolute: "KintexBG — BY VZG CONSULT" }, description: "KintexBG — Digital Financial Home Office" }
    : {}
}

export default async function LocalizedPage({params}: {params: Promise<{locale: string; slug?: string[]}>}) {
  const {slug = []} = await params
  const Page = pages[slug.join("/")]
  if (!Page) notFound()
  return <Page />
}

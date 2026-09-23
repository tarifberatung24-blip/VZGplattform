"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"

export default function SignUpSuccessPage() {
  const { locale, t } = useLanguage()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">HORIZON by VZG</p>
        <p className="mt-1 text-[10px] text-muted-foreground">BY VZG CONSULT</p>
        <h1 className="mt-8 text-2xl font-bold text-foreground">{t.auth.checkEmailTitle}</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">{t.auth.checkEmailDesc}</p>
        <Link href={`/${locale}/auth/login`} className="mt-6 inline-flex font-medium text-primary">
          {t.auth.backToLogin}
        </Link>
      </div>
    </main>
  )
}

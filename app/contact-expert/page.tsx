import Link from "next/link"
import { ContactExpertForm } from "@/components/dashboard/contact-expert-form"

export const metadata = { title: "Свържете се с експерт", description: "Поискай разговор с експерт за данъци и помощи в Германия." }

export default function ContactExpertPage() {
  return <main className="min-h-screen bg-background px-5 py-12 sm:px-8 lg:px-12"><div className="mx-auto max-w-2xl"><Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Към dashboard</Link><p className="mt-10 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Expert connection</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Нужна ти е човешка проверка?</h1><p className="mt-4 text-base leading-7 text-muted-foreground">Остави контакт и кратко описание. Екипът може да прегледа резултата от screening-а и да ти каже каква следваща стъпка е подходяща.</p><section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm"><ContactExpertForm /></section><p className="mt-6 text-xs leading-5 text-muted-foreground">Преди launch добави реалните данни на консултанта и потвърди дали услугата се предоставя от Steuerberater или Rechtsanwalt.</p></div></main>
}

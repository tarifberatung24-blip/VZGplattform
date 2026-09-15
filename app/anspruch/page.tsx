import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { EligibilityEngine } from "@/components/benefits/EligibilityEngine"

export const metadata = {
  title: "Anspruch prüfen | VZGplattform",
  description: "Проверете предварително за кои социални помощи може да имате право.",
}

export default function AnspruchPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" /> Към началото</Link>
        <div className="mt-12 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><ShieldCheck className="size-4" /> Безплатна предварителна проверка</div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Кои помощи може да са релевантни за вас?</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">Отговорете на шест кратки въпроса. VZGplattform ще сравни отговорите ви с прозрачни базови правила и ще покаже следващи стъпки за Kindergeld, Wohngeld, Bürgergeld и други.</p>
        </div>
        <div className="mt-10"><EligibilityEngine /></div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-muted-foreground">Инструментът не замества правна или социална консултация. Правото и размерът на помощта се определят от компетентната институция въз основа на пълните ви документи.</p>
      </div>
    </main>
  )
}

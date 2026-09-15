import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { EligibilityEngine } from "@/components/benefits/EligibilityEngine"

export const metadata = {
  title: "Проверка на помощи | VZGplattform",
  description: "Предварителен screening за релевантни германски социални помощи.",
}

export default function AnspruchPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-cyan-300"><ArrowLeft className="size-4" /> Към началото</Link>
        <div className="mt-12 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300"><ShieldCheck className="size-4" /> Защитена предварителна проверка</div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Кои помощи може да са релевантни за вас?</h1>
          <p className="mt-5 text-lg leading-8 text-slate-400">Отговорете на кратки въпроси. VZGplattform ще сравни отговорите с прозрачни правила за Kindergeld, Kinderzuschlag, Wohngeld и Bürgergeld и ще покаже конкретни следващи стъпки.</p>
        </div>
        <div className="mt-10"><EligibilityEngine /></div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-slate-600">Инструментът не замества правна или социална консултация. Компетентната институция определя правото и размера въз основа на пълните ви документи.</p>
      </div>
    </main>
  )
}

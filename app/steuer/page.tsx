import { TaxForm } from "@/components/tax/TaxForm"

export const metadata = {
  title: "Данъчна оценка | VZGplattform",
  description: "Предварителен screening на професионални и специални разходи за Германия.",
}

export default function SteuerPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">VZGplattform / Steuer</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Подредете данъчните си разходи</h1>
          <p className="mt-4 text-base leading-8 text-slate-400">Въведете данните за избраната година, за да получите прозрачен предварителен screening на Entfernungspauschale, home office, професионални разходи и детска грижа.</p>
        </div>
        <TaxForm />
      </div>
    </main>
  )
}

import Link from "next/link"
import { HorizonWordmark } from "@/components/brand/horizon-wordmark"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary"><HorizonWordmark className="h-[1.1em]" /></p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Страницата не е намерена</h1>
        <p className="mt-3 text-muted-foreground">Diese Seite wurde nicht gefunden.</p>
        <Link className="mt-8 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90" href="/bg">
          Към началната страница · Zur Startseite
        </Link>
      </section>
    </main>
  )
}

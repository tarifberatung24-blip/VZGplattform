"use client"

import { useParams } from "next/navigation"

/**
 * A guide case can be open while a new release is deployed. This boundary gives
 * the user a single recovery action instead of Next's generic failed-page view.
 */
export default function GuideCaseError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ locale?: string }>()
  const de = params.locale === "de"
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-5">
      <section className="paper w-full p-6 text-center">
        <h1 className="text-xl font-semibold">{de ? "Die Seite wurde aktualisiert" : "Страницата беше обновена"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {de ? "Lade sie neu und fahre mit deinem Vorgang fort." : "Зареди я отново и продължи със случая си."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {de ? "Seite neu laden" : "Обнови страницата"}
        </button>
      </section>
    </main>
  )
}

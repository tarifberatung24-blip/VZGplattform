"use client"

import { Send } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { submitLead, type LeadSubmitResult } from "./lead-submit"

export default function ContactForm({ locale }: { locale: string }) {
  const [state, setState] = useState<LeadSubmitResult>(null)

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/40 bg-slate-950/40 backdrop-blur px-6 py-8 shadow-sm">
      <h2 className="text-xl font-semibold">
        {locale === "bg" ? "Изпратете съобщение" : "Nachricht senden"}
      </h2>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submitLead(event.currentTarget, locale, setState)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Name</span>
            <input
              name="name"
              type="text"
              required
              className="h-10 rounded-xl border border-border bg-muted/20 px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
              placeholder={locale === "bg" ? "Вашето име" : "Ihr Name"}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">E-Mail</span>
            <input
              name="email"
              type="email"
              required
              className="h-10 rounded-xl border border-border bg-muted/20 px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
              placeholder={locale === "bg" ? "Вашият имейл" : "Ihre E-Mail-Adresse"}
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            {locale === "bg" ? "Съобщение" : "Nachricht"}
          </span>
          <textarea
            name="message"
            required
            rows={5}
            className="h-24 resize-none rounded-xl border border-border bg-muted/20 px-3 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            placeholder={locale === "bg" ? "Напишете съобщение..." : "Schreiben Sie Ihre Nachricht..."}
          />
        </label>

        <div className="flex flex-col gap-3">
          <p className="text-xs leading-5 text-muted-foreground">
            {locale === "bg" ? "Съобщението и данните за контакт се обработват за отговор на запитването. Вижте " : "Ihre Nachricht und Kontaktdaten werden zur Bearbeitung Ihrer Anfrage verarbeitet. Mehr dazu in der "}
            <Link className="underline hover:text-foreground" href={`/${locale}/datenschutz`}>
              {locale === "bg" ? "политиката за поверителност" : "Datenschutzerklärung"}
            </Link>.
          </p>
          {state && "ok" in state && state.ok && (
            <p className="text-sm text-foreground">
              {locale === "bg" ? "Съобщението е изпратено. Благодарим." : "Nachricht gesendet. Vielen Dank."}
            </p>
          )}
          {state && "error" in state && state.error && (
            <p className="text-sm text-foreground">
              {locale === "bg"
                ? "Изпратването не е успешно. Опитайте отново или използвайте email."
                : "Sendefehler. Bitte versuchen Sie es erneut oder nutzen Sie das E-Mail."}
            </p>
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="size-4" />
            {locale === "bg" ? "Изпрати" : "Absenden"}
          </button>
        </div>
      </form>
    </section>
  )
}

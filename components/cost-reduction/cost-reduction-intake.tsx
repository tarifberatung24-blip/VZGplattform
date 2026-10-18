"use client"

import Link from "next/link"
import { useActionState } from "react"
import { ArrowLeft, CheckCircle2, FileUp, MessageCircle, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  initialCostReductionState,
  startCostReductionRequest,
} from "@/lib/horizon/cost-reduction/actions"

const WHATSAPP_URL = "https://wa.me/message/JXXTA3JHKDX3L1"

export function CostReductionIntake({ locale }: { locale: string }) {
  const de = locale === "de"
  const [state, formAction, pending] = useActionState(startCostReductionRequest, initialCostReductionState)
  const caseHref = state.caseId ? `/${locale}/guide/${state.caseId}` : null

  const copy = de
    ? {
        back: "Zum Dashboard",
        eyebrow: "Energie-Check",
        title: "Senke deine Strom- und Gaskosten.",
        intro: "Lade deine Unterlagen hoch oder gib nur das ein, was du weißt. Wir bereiten deine Anfrage für eine persönliche Tarifprüfung vor.",
        uploadTitle: "Schnell mit Dokumenten starten",
        uploadText: "Jahresabrechnung, Unterlagen zum aktuellen Strom-, Gas- oder Wärmetarif. PDF, JPG oder PNG, maximal 3 Dateien à 10 MB.",
        documentType: "Welche Unterlagen lädst du hoch?",
        documentOptions: ["Jahresabrechnung Strom / Gas / Wärme", "Vertragsunterlagen aktueller Tarif", "Andere passende Unterlagen"],
        documents: "Dokumente auswählen",
        detailsTitle: "Oder: Trage nur das ein, was du weißt",
        detailsText: "Du kennst deinen Anbieter nicht oder hast keine Unterlagen? Das ist in Ordnung. Lass die unbekannten Felder frei und beschreibe deine Situation.",
        personalTitle: "Deine Kontaktdaten",
        firstName: "Vorname",
        lastName: "Nachname",
        email: "E-Mail",
        mobile: "Mobilnummer",
        birthDate: "Geburtsdatum (optional)",
        energyTitle: "Informationen zum Vertrag",
        energyType: "Worum geht es?",
        energyOptions: ["Strom", "Gas", "Strom und Gas", "Wärme", "Ich weiß es nicht"],
        provider: "Aktueller Anbieter, falls bekannt",
        postcode: "Postleitzahl",
        consumption: "Jahresverbrauch in kWh, falls bekannt",
        payment: "Monatlicher Abschlag in EUR, falls bekannt",
        contract: "Kündigungsfrist oder Vertragsende, falls bekannt",
        question: "Zusätzliche Informationen oder Frage",
        consent: "Ich möchte eine persönliche Tarifprüfung und willige ein, dass HORIZON by VZG die hier angegebenen Daten und Unterlagen für diese Anfrage verarbeitet.",
        privacy: "Datenschutzerklärung",
        submit: "Prüfung sicher speichern",
        saving: "Wird sicher gespeichert…",
        whatsAppTitle: "Direkt mit uns sprechen",
        whatsAppText: "Du kannst auch direkt über WhatsApp schreiben. Die Angaben aus diesem Formular werden nicht automatisch an WhatsApp übertragen.",
        whatsApp: "WhatsApp öffnen",
        nextTitle: "Was danach passiert",
        next: ["Deine Angaben und Dateien werden sicher in deinem Vorgang gespeichert.", "Wir prüfen die vorhandenen Daten und melden uns, falls etwas fehlt.", "Eine echte Ersparnis oder ein Angebot nennen wir erst nach einer persönlichen Prüfung."],
        success: (count: number) => `Deine Anfrage ist gespeichert${count ? `, ${count} Datei${count === 1 ? "" : "en"} angehängt` : ""}.`,
        openCase: "Anfrage öffnen",
        invalid: "Bitte fülle Vorname, Nachname, E-Mail, Mobilnummer und Thema aus.",
        consentError: "Bitte bestätige die Verarbeitung für diese persönliche Anfrage.",
        failed: "Die Anfrage konnte nicht vollständig gespeichert werden. Bitte öffne den Vorgang oder versuche es erneut.",
      }
    : {
        back: "Към таблото",
        eyebrow: "Енергиен преглед",
        title: "Намали разходите си за ток и газ.",
        intro: "Качи документи или въведи само това, което знаеш. Ще подготвим заявката ти за лична проверка на тарифата.",
        uploadTitle: "Бърз старт с документи",
        uploadText: "Jahresabrechnung, документи за актуалната тарифа за ток, газ или отопление. PDF, JPG или PNG, до 3 файла по 10 MB.",
        documentType: "Какви документи качваш?",
        documentOptions: ["Jahresabrechnung ток / газ / отопление", "Договор за актуална тарифа", "Друг подходящ документ"],
        documents: "Избери документи",
        detailsTitle: "Или: въведи само това, което знаеш",
        detailsText: "Не знаеш доставчика или нямаш документи? Няма проблем. Остави непознатите полета празни и опиши ситуацията си.",
        personalTitle: "Твоите данни за контакт",
        firstName: "Собствено име",
        lastName: "Фамилия",
        email: "Имейл",
        mobile: "Мобилен телефон",
        birthDate: "Дата на раждане (по желание)",
        energyTitle: "Информация за договора",
        energyType: "За какво става дума?",
        energyOptions: ["Ток", "Газ", "Ток и газ", "Отопление", "Не знам"],
        provider: "Настоящ доставчик, ако го знаеш",
        postcode: "Пощенски код",
        consumption: "Годишно потребление в kWh, ако го знаеш",
        payment: "Месечна вноска в EUR, ако я знаеш",
        contract: "Срок за прекратяване или край на договора, ако го знаеш",
        question: "Допълнителна информация или въпрос",
        consent: "Искам лична проверка на тарифата и съм съгласен HORIZON by VZG да обработи посочените тук данни и документи за тази заявка.",
        privacy: "Политика за поверителност",
        submit: "Запази заявката сигурно",
        saving: "Запазва се сигурно…",
        whatsAppTitle: "Свържи се директно с нас",
        whatsAppText: "Можеш да пишеш и директно във WhatsApp. Данните от тази форма не се изпращат автоматично към WhatsApp.",
        whatsApp: "Отвори WhatsApp",
        nextTitle: "Какво следва след това",
        next: ["Данните и файловете ти се запазват сигурно към твоята заявка.", "Проверяваме наличната информация и ще се свържем с теб, ако нещо липсва.", "Реално спестяване или оферта се посочва само след лична проверка."],
        success: (count: number) => `Заявката ти е запазена${count ? ` и са прикачени ${count} файл${count === 1 ? "" : "а"}` : ""}.`,
        openCase: "Отвори заявката",
        invalid: "Моля, попълни име, фамилия, имейл, мобилен телефон и тема.",
        consentError: "Моля, потвърди обработката за тази лична заявка.",
        failed: "Заявката не можа да се запази напълно. Отвори заявката или опитай отново.",
      }

  const error = state.error === "invalid" ? copy.invalid : state.error === "consent" ? copy.consentError : state.error ? copy.failed : null

  return (
    <main className="horizon-dashboard min-h-[calc(100svh-3.5rem)] bg-background px-4 py-5 pb-24 text-foreground sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href={`/${locale}/dashboard`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />{copy.back}
        </Link>

        <section className="mt-4 paper overflow-hidden p-5 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">{copy.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{copy.intro}</p>
          <div className="paper paper-note mt-6 flex gap-3 p-4 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <p>{de ? "Nichts wird ohne deine Prüfung und Zustimmung an einen Anbieter oder Partner weitergegeben." : "Нищо не се предава към доставчик или партньор без твой преглед и изрично съгласие."}</p>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form action={formAction} className="paper space-y-7 p-5 sm:p-7">
            <input type="hidden" name="locale" value={locale} />
            <section>
              <div className="flex gap-3"><FileUp className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><h2 className="text-lg font-bold">{copy.uploadTitle}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.uploadText}</p></div></div>
              <label className="mt-4 block text-sm font-medium" htmlFor="cost-reduction-document-type">{copy.documentType}</label>
              <select id="cost-reduction-document-type" name="documentType" className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                {copy.documentOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <label className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/50 bg-primary/5 px-4 text-center transition-colors hover:bg-primary/10" htmlFor="cost-reduction-documents">
                <FileUp className="size-5 text-primary" aria-hidden="true" /><span className="mt-2 text-sm font-semibold">{copy.documents}</span><span className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG</span>
              </label>
              <input id="cost-reduction-documents" name="documents" className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" multiple />
            </section>

            <section className="border-t border-border pt-7">
              <h2 className="text-lg font-bold">{copy.detailsTitle}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.detailsText}</p>
              <h3 className="mt-5 text-sm font-semibold">{copy.personalTitle}</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field id="firstName" label={copy.firstName} required /><Field id="lastName" label={copy.lastName} required />
                <Field id="email" label={copy.email} type="email" required /><Field id="mobile" label={copy.mobile} type="tel" required />
                <Field id="birthDate" label={copy.birthDate} type="date" />
              </div>
              <h3 className="mt-6 text-sm font-semibold">{copy.energyTitle}</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium" htmlFor="energyType">{copy.energyType} *</label><select id="energyType" name="energyType" required defaultValue="" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>{de ? "Bitte auswählen" : "Избери"}</option>{copy.energyOptions.map((option) => <option key={option}>{option}</option>)}</select></div>
                <Field id="provider" label={copy.provider} /><Field id="postcode" label={copy.postcode} inputMode="numeric" />
                <Field id="annualConsumption" label={copy.consumption} inputMode="numeric" /><Field id="monthlyPayment" label={copy.payment} inputMode="decimal" />
                <Field id="contractInfo" label={copy.contract} className="sm:col-span-2" />
              </div>
              <div className="mt-4 space-y-2"><label className="text-sm font-medium" htmlFor="details">{copy.question}</label><Textarea id="details" name="details" className="min-h-28" maxLength={3000} /></div>
            </section>

            <section className="border-t border-border pt-6">
              <label className="flex items-start gap-3 text-sm leading-6"><input name="consent" value="yes" type="checkbox" required className="mt-1 size-4" /><span>{copy.consent} <Link href={`/${locale}/datenschutz`} className="font-medium text-primary underline">{copy.privacy}</Link>.</span></label>
            </section>

            {state.ok ? <div className="paper paper-note paper-note-success flex flex-wrap items-center gap-3 p-4" role="status"><CheckCircle2 className="size-5 text-success" aria-hidden="true" /><span className="text-sm font-medium">{copy.success(state.uploadedCount)}</span>{caseHref ? <Button asChild size="sm"><Link href={caseHref}>{copy.openCase}</Link></Button> : null}</div> : null}
            {error ? <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><span>{error}</span>{caseHref ? <Button asChild size="sm" variant="outline"><Link href={caseHref}>{copy.openCase}</Link></Button> : null}</div> : null}
            <Button type="submit" className="min-h-12 w-full sm:w-auto" disabled={pending || Boolean(state.caseId)}>{pending ? copy.saving : copy.submit}<Sparkles className="size-4" aria-hidden="true" /></Button>
          </form>

          <aside className="space-y-5">
            <section className="paper p-5"><MessageCircle className="size-6 text-primary" aria-hidden="true" /><h2 className="mt-4 text-lg font-bold">{copy.whatsAppTitle}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.whatsAppText}</p><Button asChild variant="outline" className="mt-4 w-full"><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">{copy.whatsApp}</a></Button></section>
            <section className="paper paper-inset p-5"><h2 className="text-sm font-bold">{copy.nextTitle}</h2><ol className="mt-4 space-y-3">{copy.next.map((item, index) => <li key={item} className="flex gap-3 text-sm leading-5 text-muted-foreground"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>{item}</li>)}</ol></section>
          </aside>
        </div>
      </div>
    </main>
  )
}

function Field({ id, label, required, type = "text", className, inputMode }: { id: string; label: string; required?: boolean; type?: string; className?: string; inputMode?: "numeric" | "decimal" }) {
  return <div className={`space-y-2 ${className ?? ""}`}><label className="text-sm font-medium" htmlFor={id}>{label}{required ? " *" : ""}</label><Input id={id} name={id} type={type} required={required} maxLength={type === "date" ? undefined : 254} inputMode={inputMode} className="h-11" /></div>
}

"use client"

import Link from "next/link"
import { useActionState } from "react"
import { ArrowLeft, BookOpenCheck, CheckCircle2, ChevronDown, ExternalLink, FileUp, MessageCircle, ShieldCheck, Sparkles } from "lucide-react"
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
  const rights = de
    ? {
        eyebrow: "Deine Rechte bei Strom und Gas",
        title: "Kurz erklärt. Mit offiziellen Quellen.",
        intro: "Diese Hinweise gelten für private Strom- und Gasverträge in Deutschland. Sie ersetzen keine Rechtsberatung. Für Wärme/Fernwärme gelten teilweise andere Regeln.",
        source: "Offizielle Quelle",
        entries: [
          { title: "Kann ich meinen Anbieter wechseln?", text: "Ja. Du kannst deinen Strom- oder Gasanbieter wählen. Der neue Anbieter übernimmt häufig die Kündigung, wenn du ihn dazu bevollmächtigst. Vertragslaufzeit und Kündigungsfrist bleiben dabei wichtig.", source: "Bundesnetzagentur: Lieferantenwechsel", href: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/KuendigungLieferantenwechsel/Lieferantenwechsel/start.html" },
          { title: "Was zeigt meine Jahresabrechnung?", text: "Sie sollte den Abrechnungszeitraum, Zählerstände, Verbrauch, Preise und die Berechnung verständlich zeigen. Wenn etwas unklar ist, kannst du eine kostenlose Erklärung verlangen.", source: "Bundesnetzagentur: Rechnungen", href: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/RechnungenSperrungen/Rechnungen-table.html" },
          { title: "Was bedeutet „Schätzung“?", text: "Bei einer Schätzung wurde dein Verbrauch nicht vollständig aus einem tatsächlichen Zählerstand abgerechnet. Die Rechnung muss dies deutlich kennzeichnen und Grund sowie Berechnungsfaktoren nennen.", source: "EnWG § 40a", href: "https://www.gesetze-im-internet.de/enwg_2005/__40a.html" },
          { title: "Wer ist Lieferant, Netzbetreiber und Messstellenbetreiber?", text: "Der Lieferant verkauft dir Energie und rechnet ab. Der Netzbetreiber betreibt das Netz. Der Messstellenbetreiber ist für Zähler und Messtechnik zuständig. Das können verschiedene Unternehmen sein.", source: "Bundesnetzagentur: Messstellenbetreiber", href: "https://www.bundesnetzagentur.de/SharedDocs/A_Z_Glossar/M/Messstellenbetreiber_grundzustaendig.html" },
          { title: "Wer darf an meinen Zähler?", text: "Gib Unbekannten keinen freien Zugang zu Zähler, Rechnung oder Vertragsunterlagen. Bei einem angekündigten Besuch: Ausweis prüfen und über die offizielle Nummer auf deiner Rechnung nachfragen. Bei Unsicherheit nicht vor Ort unterschreiben.", source: "Bundesnetzagentur: Schutz vor ungewolltem Wechsel", href: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/KuendigungLieferantenwechsel/Lieferantenwechsel/start.html" },
          { title: "Wann kann Strom oder Gas gesperrt werden?", text: "Nicht sofort. Für Haushalte gelten gesetzliche Voraussetzungen, eine vorherige Androhung und Fristen. Bei einer Sperrandrohung solltest du das Schreiben sofort prüfen lassen. In der Grundversorgung kannst du eine Vereinbarung zur Abwendung der Sperre verlangen.", source: "EnWG §§ 41f–41g", href: "https://www.gesetze-im-internet.de/enwg_2005/__41f.html" },
          { title: "Kann ich Unterstützung vom Staat bekommen?", text: "Das zuständige Jobcenter prüft Hilfe individuell. Angemessene Wohn- und Heizkosten können berücksichtigt werden; Haushaltsstrom ist grundsätzlich Teil des Regelbedarfs. Horizon hilft beim Ordnen der Unterlagen, entscheidet aber nicht über den Anspruch.", source: "Bundesagentur für Arbeit: Wohnen und Heizen", href: "https://www.arbeitsagentur.de/grundsicherung/wohnen" },
          { title: "Was mache ich bei einer möglichen Täuschung an der Haustür?", text: "Gib keine Kunden-, Zähler- oder MaLo-ID an Unbekannte weiter und unterschreibe nichts unter Zeitdruck. Bei untergeschobenen Haustür- oder Fernabsatzverträgen kann ein Widerrufsrecht bestehen; prüfe Unterlagen und Frist sofort.", source: "Bundesnetzagentur: ungewollter Anbieterwechsel", href: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/KuendigungLieferantenwechsel/Lieferantenwechsel/start.html" },
          { title: "Was prüfe ich vor einer neuen Tarifzusage?", text: "Vergleiche nicht nur den Preis: Prüfe Laufzeit, Kündigungsfrist, Preisgarantie, Preisanpassung, Bonusbedingungen, Zahlungsart und Starttermin. Eine Tarifprüfung von Horizon wird erst nach deiner persönlichen Zustimmung weitergegeben.", source: "Bundesnetzagentur: Vertragsinhalte prüfen", href: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/KuendigungLieferantenwechsel/Lieferantenwechsel/start.html" },
        ],
      }
    : {
        eyebrow: "Твоите права при ток и газ",
        title: "Кратко обяснени. С официални източници.",
        intro: "Тази информация важи за частни договори за ток и газ в Германия и не заменя правна консултация. За Wärme/Fernwärme може да важат други правила.",
        source: "Официален източник",
        entries: [
          { title: "Мога ли да сменя доставчика си?", text: "Да. Можеш да избереш доставчик на ток или газ. Новият доставчик често организира прекратяването, ако му дадеш пълномощие. Срокът на договора и срокът за прекратяване остават важни.", source: "Bundesnetzagentur: смяна на доставчик", href: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/KuendigungLieferantenwechsel/Lieferantenwechsel/start.html" },
          { title: "Какво показва годишната ми сметка?", text: "Тя трябва разбираемо да показва периода, стойностите на електромера, потреблението, цените и изчислението. Ако нещо не е ясно, можеш да поискаш безплатно обяснение.", source: "Bundesnetzagentur: сметки", href: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/RechnungenSperrungen/Rechnungen-table.html" },
          { title: "Какво означава „Schätzung“?", text: "При Schätzung потреблението не е изчислено изцяло по реално отчетена стойност. Сметката трябва ясно да отбележи това, причината и факторите, използвани за оценката.", source: "EnWG § 40a", href: "https://www.gesetze-im-internet.de/enwg_2005/__40a.html" },
          { title: "Кой е Lieferant, Netzbetreiber и Messstellenbetreiber?", text: "Lieferant продава енергията и издава сметката. Netzbetreiber управлява мрежата. Messstellenbetreiber отговаря за електромера и измерването. Това може да са различни организации.", source: "Bundesnetzagentur: Messstellenbetreiber", href: "https://www.bundesnetzagentur.de/SharedDocs/A_Z_Glossar/M/Messstellenbetreiber_grundzustaendig.html" },
          { title: "Кой има право на достъп до електромера ми?", text: "Не давай свободен достъп до електромера, сметката или договора си на непознати. При обявено посещение провери служебната карта и се обади на официалния номер от сметката. При съмнение не подписвай на място.", source: "Bundesnetzagentur: защита от нежелана смяна", href: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/KuendigungLieferantenwechsel/Lieferantenwechsel/start.html" },
          { title: "Кога могат да спрат ток или газ?", text: "Не веднага. За домакинствата има законови условия, предварително предупреждение и срокове. При писмо за прекъсване го провери веднага. При Grundversorgung можеш да поискаш споразумение за избягване на прекъсването.", source: "EnWG §§ 41f–41g", href: "https://www.gesetze-im-internet.de/enwg_2005/__41f.html" },
          { title: "Мога ли да получа помощ от държавата?", text: "Компетентният Jobcenter проверява всеки случай индивидуално. Разумните разходи за жилище и отопление може да бъдат признати; домашният ток по правило е част от Regelsatz. Horizon помага с документите, но не решава дали има право на помощ.", source: "Bundesagentur für Arbeit: жилище и отопление", href: "https://www.arbeitsagentur.de/grundsicherung/wohnen" },
          { title: "Какво да направя при възможна измама на вратата?", text: "Не давай клиентски номер, номер на електромер или MaLo-ID на непознат и не подписвай под напрежение. При договор на вратата или от разстояние може да има право на отказ — провери документа и срока веднага.", source: "Bundesnetzagentur: нежелана смяна на доставчик", href: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/KuendigungLieferantenwechsel/Lieferantenwechsel/start.html" },
          { title: "Какво да проверя преди да приема нова тарифа?", text: "Не гледай само цената: провери срок, предизвестие, ценова гаранция, промяна на цената, условия за бонус, начин на плащане и начална дата. Horizon предава заявка за проверка само след твоето лично съгласие.", source: "Bundesnetzagentur: проверка на договорните условия", href: "https://www.bundesnetzagentur.de/DE/Vportal/Energie/KuendigungLieferantenwechsel/Lieferantenwechsel/start.html" },
        ],
      }

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

        <section className="paper mt-5 p-5 sm:p-7" aria-labelledby="energy-rights-title">
          <div className="flex gap-3">
            <BookOpenCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{rights.eyebrow}</p>
              <h2 id="energy-rights-title" className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{rights.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{rights.intro}</p>
            </div>
          </div>
          <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {rights.entries.map((entry) => (
              <details key={entry.title} className="group bg-background">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold marker:hidden hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
                  <span>{entry.title}</span>
                  <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-border px-4 py-4">
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{entry.text}</p>
                  <a href={entry.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {rights.source}: {entry.source}<ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </div>
              </details>
            ))}
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

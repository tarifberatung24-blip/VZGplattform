"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"
import { legalAddress, legalProfile, legalProfileMissing } from "@/lib/legal-profile"

type LegalPageType = "privacy" | "terms" | "imprint" | "affiliate" | "withdrawal"

const content: Record<LegalPageType, { title: string; titleBg: string; intro: string; sections: Array<[string, string]> }> = {
  imprint: {
    title: "Impressum", titleBg: "Импресум",
    intro: "Angaben gemäß § 5 DDG.",
    sections: [
      ["Anbieter", "Die vollständigen Anbieterangaben werden aus den geschützten Deployment-Einstellungen geladen."],
      ["Kontakt", "Für Anfragen nutzen Sie bitte die unten angegebene Kontakt-E-Mail. Eine Telefonnummer wird veröffentlicht, sobald sie hinterlegt ist."],
      ["Register und Umsatzsteuer", "Angaben zu Handelsregister und Umsatzsteuer-ID werden nur angezeigt, wenn sie für den Anbieter tatsächlich bestehen."],
      ["Inhaltlich verantwortlich", "Verantwortlich für die Inhalte dieser Website ist die im Impressum angegebene vertretungsberechtigte Person."],
    ],
  },
  privacy: {
    title: "Datenschutzerklärung", titleBg: "Политика за поверителност",
    intro: "Informationen zur Verarbeitung personenbezogener Daten bei KintexBG.",
    sections: [
      ["Verantwortlicher", "Die verantwortliche Stelle und die Kontaktdaten stehen im Impressum. Personenbezogene Daten werden nur verarbeitet, soweit dies für die jeweilige Funktion erforderlich ist."],
      ["Konto, Verträge und Dokumente", "Bei Registrierung und Nutzung des geschützten Bereichs verarbeiten wir Konto- und Profildaten sowie die von Ihnen hochgeladenen Verträge und Dokumente. Dies dient der Bereitstellung Ihres persönlichen Dokumentenbereichs und der von Ihnen angeforderten Funktionen."],
      ["Technische Dienstleister", "Für Hosting und die technische Bereitstellung werden Vercel und Supabase eingesetzt. Supabase verarbeitet Authentifizierungs-, Datenbank- und Speicherinformationen für den geschützten Bereich."],
      ["KI-Analyse und Anfragen", "Wenn Sie eine Analyse oder den Chat ausdrücklich nutzen, können die eingegebenen Inhalte zur Verarbeitung an Groq übermittelt werden. Bei einer freiwilligen Service-Anfrage können die von Ihnen angegebenen Kontaktdaten und Angaben an den eingerichteten n8n-Workflow zur Bearbeitung weitergegeben werden."],
      ["Partnerlinks", "Verlassen Sie KintexBG über einen Partnerlink, gelten die Datenschutzinformationen des jeweiligen Partners. KintexBG erhält keinen Zugriff auf den Vertrag, den Sie direkt beim Partner abschließen."],
      ["Cookies und Reichweitenmessung", "Für Anmeldung und Sitzungsverwaltung können technisch notwendige Cookies verwendet werden. Aktuell werden keine Marketing- oder Affiliate-Tracking-Skripte geladen. Vor Einführung zusätzlicher, nicht notwendiger Technologien wird diese Erklärung und gegebenenfalls die Einwilligungsverwaltung ergänzt."],
      ["Ihre Rechte", "Sie haben nach Maßgabe der DSGVO insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht auf Beschwerde bei einer Datenschutzaufsichtsbehörde."],
    ],
  },
  terms: {
    title: "Allgemeine Geschäftsbedingungen", titleBg: "Общи условия",
    intro: "Rahmenbedingungen für die Nutzung der KintexBG-Plattform durch Privatkunden.",
    sections: [
      ["Geltungsbereich", "Diese Bedingungen regeln die Nutzung der digitalen KintexBG-Plattform durch private Nutzerinnen und Nutzer."],
      ["Leistungsumfang", "KintexBG unterstützt beim Ordnen von Dokumenten, beim Anzeigen von Vertragsinformationen und bei der verständlichen Orientierung. Der konkrete Funktionsumfang kann sich je nach freigeschaltetem Bereich unterscheiden."],
      ["Keine individuelle Beratung", "Automatisierte Zusammenfassungen, Übersetzungen und Hinweise sind keine individuelle Rechts-, Steuer-, Anlage-, Kredit- oder Versicherungsberatung. Wichtige Entscheidungen und Fristen müssen anhand des Originals und gegebenenfalls mit einer zugelassenen Fachperson geprüft werden."],
      ["Pflichten der Nutzer", "Es dürfen nur rechtmäßig bereitgestellte Inhalte hochgeladen werden. Zugangsdaten sind vertraulich zu behandeln. Unklare oder fehlerhafte Analyseergebnisse dürfen nicht ungeprüft als Grundlage für Entscheidungen verwendet werden."],
      ["Partnerangebote", "Partnerangebote sind als solche gekennzeichnet. Ein Vertrag mit einem Partner kommt ausschließlich zwischen Ihnen und dem jeweiligen Partner zustande; dessen Bedingungen und Datenschutzinformationen gelten ergänzend."],
      ["Kosten", "Die Plattform enthält derzeit keinen eigenen Online-Checkout. Bevor kostenpflichtige KintexBG-Leistungen online buchbar werden, werden Preis, Leistungsumfang, Vertragslaufzeit und die hierfür geltenden Verbraucherinformationen separat veröffentlicht."],
    ],
  },
  affiliate: {
    title: "Hinweis zu Partnerlinks", titleBg: "Партньорска прозрачност",
    intro: "Transparenz zu Empfehlungen und externen Partnerangeboten.",
    sections: [
      ["Kennzeichnung", "Links zu Partnern und Empfehlungen werden als Partnerangebot oder Werbung gekennzeichnet."],
      ["Vergütung", "Bei einem erfolgreichen Abschluss über einen gekennzeichneten Link kann KintexBG vom Partner eine Vergütung erhalten. Für Sie entstehen durch das Anklicken eines Links allein keine zusätzlichen Kosten."],
      ["Unabhängige Entscheidung", "Ob ein Angebot zu Ihnen passt, entscheiden Sie selbst anhand der Vertragsunterlagen des Partners. KintexBG gibt keine individuelle Finanz-, Versicherungs-, Kredit- oder Rechtsberatung."],
      ["Externe Websites", "Für Preise, Verfügbarkeit, Vertragsabschluss und Datenschutz auf Partnerseiten ist ausschließlich der jeweilige Partner verantwortlich."],
    ],
  },
  withdrawal: {
    title: "Widerruf und Verbraucherinformationen", titleBg: "Отказ и информация за потребители",
    intro: "Hinweise zu Verträgen mit KintexBG und zu externen Partnerangeboten.",
    sections: [
      ["Aktueller Stand", "Über diese Website wird derzeit kein eigener kostenpflichtiger Vertrag mit KintexBG online abgeschlossen. Deshalb gibt es aktuell kein separates Online-Widerrufsformular für KintexBG-Leistungen."],
      ["Partnerverträge", "Für Verträge, die Sie direkt mit einem Partner schließen, gelten ausschließlich dessen Widerrufsbelehrung, Vertragsbedingungen und Kontaktwege."],
      ["Künftige kostenpflichtige Leistungen", "Bevor KintexBG eigene kostenpflichtige Leistungen online anbietet, werden die gesetzlich erforderlichen Verbraucherinformationen, Preise, Laufzeiten und eine passende Widerrufsbelehrung bereitgestellt."],
    ],
  },
}

export function LegalPage({ type }: { type: LegalPageType }) {
  const { locale } = useLanguage()
  const page = content[type]
  const isBg = locale === "bg"
  const address = legalAddress()
  const hasMissingProfile = legalProfileMissing.length > 0
  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <article className="mx-auto flex max-w-3xl flex-col gap-8">
        <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground">← {isBg ? "Към началото" : "Zur Startseite"}</Link>
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium text-primary">{isBg ? "Правна информация" : "Rechtliche Informationen"}</p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight">{isBg ? page.titleBg : page.title}</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{page.intro}</p>
        </header>
        {hasMissingProfile && (
          <aside className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-relaxed text-foreground">
            {isBg ? "Правните данни на доставчика все още не са попълнени в production configuration. Страницата не е готова за партньорски кандидатури." : "Die Pflichtangaben des Anbieters sind noch nicht in den Production-Einstellungen hinterlegt. Diese Seite ist noch nicht bereit für Partnerbewerbungen."}
          </aside>
        )}
        {type === "imprint" && (
          <section className="flex flex-col gap-2 border-t border-border pt-6">
            <h2 className="text-xl font-semibold">{isBg ? "Данни за доставчика" : "Angaben zum Anbieter"}</h2>
            {address.length > 0 && <address className="not-italic leading-relaxed text-muted-foreground">{address.map((line) => <span className="block" key={line}>{line}</span>)}</address>}
            {legalProfile.email && <a className="text-primary hover:underline" href={`mailto:${legalProfile.email}`}>{legalProfile.email}</a>}
            {legalProfile.phone && <a className="text-primary hover:underline" href={`tel:${legalProfile.phone}`}>{legalProfile.phone}</a>}
            {legalProfile.registerCourt && legalProfile.registerNumber && <p className="text-muted-foreground">{legalProfile.registerCourt}, {legalProfile.registerNumber}</p>}
            {legalProfile.vatId && <p className="text-muted-foreground">Umsatzsteuer-ID: {legalProfile.vatId}</p>}
          </section>
        )}
        <div className="flex flex-col gap-6">
          {page.sections.map(([heading, body]) => <section key={heading} className="flex flex-col gap-2 border-t border-border pt-6"><h2 className="text-xl font-semibold">{heading}</h2><p className="leading-relaxed text-muted-foreground">{body}</p></section>)}
        </div>
      </article>
    </main>
  )
}

"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"

const copy = {
  de: {
    privacy: { title: "Datenschutzerklärung", intro: "Informationen zur Verarbeitung personenbezogener Daten durch KintexBG.", sections: [["Verantwortlicher", "KintexBG · Diese Angaben sind als Platzhalter für die finale rechtliche Prüfung gedacht."], ["Verarbeitung", "Wir verarbeiten Daten nur, soweit dies für die Bereitstellung unserer Dienste, die Kommunikation und die Verbesserung des Angebots erforderlich ist."], ["Ihre Rechte", "Sie haben insbesondere das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Widerspruch im Rahmen der gesetzlichen Vorgaben."], ["Kontakt", "Bitte ergänzen Sie vor dem produktiven Einsatz die vollständigen Unternehmens- und Kontaktdaten."]] },
    terms: { title: "Allgemeine Geschäftsbedingungen", intro: "Rahmenbedingungen für die Nutzung von KintexBG.", sections: [["Geltungsbereich", "Diese Nutzungsbedingungen regeln die Nutzung der digitalen Orientierungshilfen von KintexBG."], ["Hinweis zur Beratung", "Die Inhalte dienen der strukturierten Vorprüfung und Orientierung. Sie ersetzen keine individuelle Steuer-, Rechts- oder Finanzberatung."], ["Nutzung", "Bitte machen Sie nur Angaben, zu deren Verwendung Sie berechtigt sind, und prüfen Sie Ergebnisse vor wichtigen Entscheidungen."], ["Rechtliche Prüfung", "Dieser Text ist ein Platzhalter und muss vor dem produktiven Einsatz rechtlich geprüft und mit vollständigen Anbieterangaben ergänzt werden."]] },
    back: "Zur Startseite", label: "Rechtliche Informationen"
  },
  bg: {
    privacy: { title: "Политика за поверителност", intro: "Информация за обработването на лични данни от KintexBG.", sections: [["Отговорно лице", "KintexBG · Тези данни са примерни и трябва да бъдат проверени юридически преди публикуване."], ["Обработване", "Обработваме данни само доколкото това е необходимо за услугите, комуникацията и подобряването на предложението."], ["Твоите права", "Имаш право на достъп, корекция, изтриване, ограничаване на обработването и възражение съгласно закона."], ["Контакт", "Преди продуктивно използване добави пълните данни за фирмата и контактите."]] },
    terms: { title: "Общи условия", intro: "Условия за използване на KintexBG.", sections: [["Обхват", "Тези условия уреждат използването на дигиталните инструменти за ориентация на KintexBG."], ["Важно уточнение", "Съдържанието служи за предварителна проверка и ориентация. То не заменя индивидуална данъчна, правна или финансова консултация."], ["Използване", "Въвеждай само данни, за чието използване имаш право, и проверявай резултатите преди важни решения."], ["Юридическа проверка", "Този текст е примерен и трябва да бъде юридически проверен и допълнен с пълни данни за доставчика преди публикуване."]] },
    back: "Към началото", label: "Правна информация"
  }
} as const

export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const { locale } = useLanguage()
  const language = copy[locale]
  const content = language[type === "privacy" ? "privacy" : "terms"]
  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <article className="mx-auto flex max-w-3xl flex-col gap-8">
        <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground">← {language.back}</Link>
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium text-primary">{language.label}</p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight">{content.title}</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{content.intro}</p>
        </header>
        <div className="flex flex-col gap-6">
          {content.sections.map(([heading, body]) => <section key={heading} className="flex flex-col gap-2 border-t border-border pt-6"><h2 className="text-xl font-semibold">{heading}</h2><p className="leading-relaxed text-muted-foreground">{body}</p></section>)}
        </div>
      </article>
    </main>
  )
}

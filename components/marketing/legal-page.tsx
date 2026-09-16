"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"

const copy = {
  de: {
    privacy: { title: "Datenschutzerklärung", intro: "Informationen zur Verarbeitung personenbezogener Daten bei VZGplattform.", sections: [
      ["Verantwortlicher", "[Vollständiger Name/Firma], [Anschrift], [E-Mail]. Bitte ersetzen Sie diese Platzhalter vor der Veröffentlichung durch die vollständigen Anbieterangaben."],
      ["Konto und Plattform", "Bei Registrierung und Nutzung verarbeiten wir E-Mail-Adresse, Authentifizierungsdaten sowie die von Ihnen gespeicherten Profil-, Haushalts-, Vertrags- und Dokumentdaten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO für die Vertragserfüllung und Art. 6 Abs. 1 lit. f DSGVO für die sichere Bereitstellung und Missbrauchsprävention."],
      ["Bescheid-Analyse", "Wenn Sie ein Dokument zur Analyse hochladen, wird es in Supabase Storage gespeichert. Der extrahierte Text beziehungsweise das Bild wird zur strukturierten Analyse an Cerebras AI, einen technischen KI-Dienstleister, übertragen. Wir senden nur die für die Analyse erforderlichen Daten. Konfigurieren Sie vor dem Launch die Auftragsverarbeitungsverträge, Transfermechanismen und die tatsächlichen Speicherfristen."],
      ["Automatisierte Verarbeitung", "Die KI liefert ausschließlich eine vorläufige Orientierung (Screening). Sie trifft keine verbindliche Entscheidung und ersetzt keine Steuer-, Rechts- oder Sozialberatung. Prüfen Sie jedes Datum, jeden Betrag und jede Frist anhand des Originals."],
      ["Speicherdauer und Löschung", "Wir speichern Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen. Löschanfragen richten Sie an [Datenschutz-E-Mail]. Dokumente sollten im Konto selbst gelöscht werden können; ergänzen Sie vor Launch die konkrete technische Frist."],
      ["Ihre Rechte", "Sie haben nach Maßgabe der DSGVO insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Sie können sich außerdem bei einer Datenschutzaufsichtsbehörde beschweren."],
      ["Dienstleister", "Supabase stellt Authentifizierung, Datenbank und Storage bereit. Cerebras AI verarbeitet Analyseanfragen. Ergänzen Sie vor Launch die aktuelle Liste der Unterauftragsverarbeiter, Standorte und Transfergarantien."],
    ] },
    terms: { title: "Allgemeine Geschäftsbedingungen", intro: "Bedingungen für die Nutzung der VZGplattform Screening- und Organisationsfunktionen.", sections: [
      ["Geltungsbereich", "Diese Bedingungen gelten für die Nutzung der digitalen Funktionen von [Vollständiger Name/Firma]. Die vollständigen Anbieterangaben sind vor dem Launch einzusetzen."],
      ["Leistungsumfang", "VZGplattform unterstützt Nutzer bei der strukturierten Erfassung von Daten, der Vorprüfung möglicher Ansprüche und der Zusammenfassung hochgeladener Schreiben. Umfang und Verfügbarkeit können sich ändern."],
      ["Kein Beratungs- oder Vertretungsvertrag", "Die Ergebnisse sind allgemeine, automatisierte Orientierung und kein Steuer-, Rechts-, Sozialleistungs- oder Finanzrat. Es wird keine verbindliche Berechnung, Fristberechnung, Erfolgsaussicht oder Vertretung versprochen. Für wichtige Entscheidungen wenden Sie sich an einen zugelassenen Steuerberater, Rechtsanwalt oder die zuständige Behörde."],
      ["Pflichten der Nutzer", "Nutzer müssen Zugangsdaten schützen, nur rechtmäßig nutzbare Dokumente hochladen und Ausgaben der Plattform vor einer Handlung anhand der Originalunterlagen prüfen. Unzulässige, schädliche oder missbräuchliche Nutzung ist untersagt."],
      ["Haftung und Verfügbarkeit", "Die gesetzlichen Haftungsregeln bleiben unberührt. Für einfache Fahrlässigkeit haften wir nur im gesetzlich zulässigen Umfang und nicht für Entscheidungen, die ausschließlich auf einem unverifizierten Screening beruhen."],
      ["Kontakt und Änderungen", "Fragen richten Sie an [Support-E-Mail]. Änderungen dieser Bedingungen werden mit angemessener Vorankündigung veröffentlicht. Zwingende Verbraucherschutzrechte bleiben unberührt."],
    ] },
    back: "Zur Startseite", label: "Rechtliche Informationen"
  },
  bg: {
    privacy: { title: "Политика за поверителност", intro: "Информация за обработването на лични данни във VZGplattform.", sections: [
      ["Отговорно лице", "[Пълно име/фирма], [адрес], [имейл]. Замени тези placeholders с реалните данни преди публикуване."],
      ["Профил и платформа", "При регистрация обработваме имейл, данни за удостоверяване и въведените от теб профилни, домакински, договорни и документни данни. Правното основание е чл. 6, ал. 1, б. b и f от GDPR според конкретната цел."],
      ["Анализ на Bescheid", "Каченият документ се съхранява в Supabase Storage. Извлеченият текст или изображение се изпраща към Cerebras AI за структурирано извличане на вид документ, срок, действие и сума. Преди launch трябва да се потвърдят договорите за обработване, трансферите извън ЕИП и конкретните срокове за съхранение."],
      ["Автоматизирана обработка", "AI резултатът е само предварителен screening. Той не е данъчен, правен или социален съвет и не взема обвързващо решение. Провери всяка дата, сума и Frist спрямо оригинала."],
      ["Срок и изтриване", "Съхраняваме данните само докато са нужни за целта или докато законът изисква. За изтриване пиши на [имейл за защита на данните]. Преди launch добави реалните технически срокове и self-service изтриване на документи."],
      ["Твоите права", "Имаш права на достъп, корекция, изтриване, ограничаване, преносимост и възражение съгласно GDPR, както и право на жалба до компетентния надзорен орган."],
      ["Доставчици", "Supabase предоставя login, база данни и storage. Cerebras AI обработва заявките за анализ. Преди launch добави актуалните подизпълнители, местоположения и гаранции за трансфер."],
    ] },
    terms: { title: "Общи условия", intro: "Условия за използване на screening и организационните функции на VZGplattform.", sections: [
      ["Обхват", "Тези условия уреждат използването на дигиталните функции на [пълно име/фирма]. Замени placeholders с реалните данни преди launch."],
      ["Какво предоставя платформата", "VZGplattform помага за структурирано въвеждане на данни, предварителна проверка на възможни помощи и обобщаване на качени писма. Обхватът и наличността могат да се променят."],
      ["Не е консултация или представителство", "Резултатите са обща автоматизирана ориентация, а не данъчен, правен, социален или финансов съвет. Няма гарантирана точност, Frist, сума или правна последица. За важни решения се консултирай със Steuerberater, Rechtsanwalt или компетентната институция."],
      ["Задължения на потребителя", "Пази достъпа си, качвай само документи, които имаш право да използваш, и проверявай всеки AI резултат спрямо оригинала преди действие. Забранена е злоупотреба с платформата."],
      ["Отговорност и наличност", "Задължителните законови правила остават в сила. Не разчитай единствено на непроверен screening за важни решения или срокове."],
      ["Контакт и промени", "Пиши на [support имейл]. Промените в условията ще бъдат публикувани с разумно предизвестие, без да се засягат задължителните права на потребителите."],
    ] },
    back: "Към началото", label: "Правна информация"
  }
} as const

export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const { locale } = useLanguage(); const language = copy[locale]; const content = language[type]
  return <main className="min-h-screen bg-background px-4 py-16 text-foreground"><article className="mx-auto flex max-w-3xl flex-col gap-8"><Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground">← {language.back}</Link><header className="flex flex-col gap-3"><p className="text-sm font-medium text-primary">{language.label}</p><h1 className="text-balance text-4xl font-semibold tracking-tight">{content.title}</h1><p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{content.intro}</p><p className="border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">Този шаблон трябва да бъде попълнен с реалните фирмени данни и прегледан от германски юрист преди production launch.</p></header><div className="flex flex-col gap-6">{content.sections.map(([heading, body]) => <section key={heading} className="flex flex-col gap-2 border-t border-border pt-6"><h2 className="text-xl font-semibold">{heading}</h2><p className="leading-relaxed text-muted-foreground">{body}</p></section>)}</div></article></main>
}

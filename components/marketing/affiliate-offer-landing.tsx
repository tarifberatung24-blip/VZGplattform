"use client"

import Link from "next/link"
import { track } from "@vercel/analytics"
import { ArrowRight, CheckCircle2, CircleDollarSign, FileSearch, Lightbulb, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"
import type { AffiliateOfferId } from "@/lib/affiliate-offers"

type OfferCopy = {
  eyebrow: string
  title: string
  intro: string
  benefits: string[]
  steps: string[]
  caution: string
  cta: string
  unavailable: string
}

const content: Record<AffiliateOfferId, { icon: typeof FileSearch; bg: OfferCopy; de: OfferCopy }> = {
  schufa: {
    icon: FileSearch,
    bg: {
      eyebrow: "SCHUFA и кредитоспособност", title: "Провери данните си, преди да кандидатстваш", intro: "Виж каква информация за кредитоспособността ти е налична и избери подходящия вид справка за твоята цел — например наем или подготовка за кредит.", benefits: ["По-ясна подготовка за важни договори", "Разлика между безплатен преглед на данни и платени продукти", "Директно към официалния партньор"], steps: ["Избери вида справка", "Идентифицирай се при партньора", "Прегледай резултата и условията"], caution: "KintexBG не вижда твоя SCHUFA резултат и не може да го променя.", cta: "Провери SCHUFA при партньора", unavailable: "Партньорската връзка се настройва. Използвай формата за контакт, за да те уведомим." },
    de: {
      eyebrow: "SCHUFA & Bonität", title: "Prüfe deine Daten, bevor du einen Antrag stellst", intro: "Sieh nach, welche Bonitätsinformationen verfügbar sind, und wähle die passende Auskunft für dein Ziel — zum Beispiel Wohnungssuche oder Kreditvorbereitung.", benefits: ["Besser vorbereitet für wichtige Verträge", "Kostenlose Dateneinsicht und kostenpflichtige Produkte klar unterscheiden", "Direkt zum offiziellen Partner"], steps: ["Art der Auskunft wählen", "Beim Partner identifizieren", "Ergebnis und Konditionen prüfen"], caution: "KintexBG sieht deinen SCHUFA-Score nicht und kann ihn nicht verändern.", cta: "SCHUFA beim Partner prüfen", unavailable: "Der Partnerlink wird gerade eingerichtet. Über das Kontaktformular informieren wir dich, sobald er aktiv ist." },
  },
  credit: {
    icon: CircleDollarSign,
    bg: {
      eyebrow: "Потребителски кредит", title: "Сравни възможни кредити с ясна месечна вноска", intro: "Подготви сума, срок и цел. Партньорът показва възможни оферти според собствените си критерии и условията на банките.", benefits: ["Сравнение от едно място", "Преди кандидатстване виж ориентировъчна вноска", "Финалните условия са при банката"], steps: ["Въведи сума и срок", "Попълни данните си при партньора", "Сравни предложените условия"], caution: "Няма гаранция за одобрение. По-високият SCHUFA резултат може да подобри шансовете, но решението е изцяло на кредитора.", cta: "Сравни потребителски кредити", unavailable: "Партньорската връзка се настройва. Използвай формата за контакт, за да те уведомим." },
    de: {
      eyebrow: "Ratenkredit", title: "Mögliche Kredite mit klarer Monatsrate vergleichen", intro: "Bereite Betrag, Laufzeit und Zweck vor. Der Partner zeigt mögliche Angebote nach seinen Kriterien und den Bedingungen der Banken.", benefits: ["Vergleich an einem Ort", "Rate vor dem Antrag besser einordnen", "Verbindliche Konditionen kommen von der Bank"], steps: ["Betrag und Laufzeit eingeben", "Daten beim Partner ausfüllen", "Vorgeschlagene Konditionen vergleichen"], caution: "Eine Zusage ist nicht garantiert. Ein höherer SCHUFA-Score kann die Chancen verbessern; die Entscheidung trifft ausschließlich der Kreditgeber.", cta: "Ratenkredite vergleichen", unavailable: "Der Partnerlink wird gerade eingerichtet. Über das Kontaktformular informieren wir dich, sobald er aktiv ist." },
  },
  kfz: {
    icon: ShieldCheck,
    bg: {
      eyebrow: "Kfz застраховка", title: "Провери дали автомобилната ти застраховка още ти пасва", intro: "Сравни варианти за автомобилна застраховка според данните за колата, шофьора и желаното покритие.", benefits: ["Разбери Haftpflicht, Teilkasko и Vollkasko", "Сравни самоучастие и условия", "Виж оферти директно при партньора"], steps: ["Подготви HSN/TSN и SF клас", "Въведи данните при партньора", "Сравни покритие, цена и условия"], caution: "Цената и приемането зависят от данните в заявката и се потвърждават от застрахователя.", cta: "Сравни Kfz застраховки", unavailable: "Партньорската връзка се настройва. Използвай формата за контакт, за да те уведомим." },
    de: {
      eyebrow: "Kfz-Versicherung", title: "Prüfe, ob deine Autoversicherung noch zu dir passt", intro: "Vergleiche Kfz-Versicherungen anhand der Daten zum Fahrzeug, zu den Fahrenden und zum gewünschten Schutz.", benefits: ["Haftpflicht, Teilkasko und Vollkasko verstehen", "Selbstbeteiligung und Bedingungen vergleichen", "Angebote direkt beim Partner ansehen"], steps: ["HSN/TSN und SF-Klasse bereithalten", "Daten beim Partner eingeben", "Schutz, Preis und Bedingungen vergleichen"], caution: "Preis und Annahme hängen von den Antragsdaten ab und werden vom Versicherer bestätigt.", cta: "Kfz-Versicherungen vergleichen", unavailable: "Der Partnerlink wird gerade eingerichtet. Über das Kontaktformular informieren wir dich, sobald er aktiv ist." },
  },
  energy: {
    icon: Lightbulb,
    bg: {
      eyebrow: "Ток и газ", title: "Оптимизирай тарифата си с данните от годишната сметка", intro: "Сравни ток или газ, когато разполагаш с пощенски код и годишно потребление. Така виждаш предложения, които са релевантни за твоя адрес.", benefits: ["Провери текуща цена, срок и Kündigungsfrist", "Сравни според реалното годишно потребление", "Смяната се извършва при избрания доставчик"], steps: ["Подготви последната Jahresabrechnung", "Въведи PLZ и годишно потребление", "Сравни цена, бонуси и Preisgarantie"], caution: "Спестяването не е гарантирано. Проверявай крайната цена, срока и условията преди сключване.", cta: "Сравни ток и газ", unavailable: "Партньорската връзка се настройва. Използвай формата за контакт, за да те уведомим." },
    de: {
      eyebrow: "Strom & Gas", title: "Optimiere deinen Tarif mit den Daten aus der Jahresabrechnung", intro: "Vergleiche Strom oder Gas, wenn du Postleitzahl und Jahresverbrauch bereithältst. So siehst du Angebote, die zu deinem Wohnort passen.", benefits: ["Aktuellen Preis, Laufzeit und Kündigungsfrist prüfen", "Nach echtem Jahresverbrauch vergleichen", "Der Wechsel erfolgt beim gewählten Anbieter"], steps: ["Letzte Jahresabrechnung bereithalten", "PLZ und Jahresverbrauch eingeben", "Preis, Bonus und Preisgarantie vergleichen"], caution: "Eine Ersparnis ist nicht garantiert. Prüfe Endpreis, Laufzeit und Bedingungen vor dem Abschluss.", cta: "Strom und Gas vergleichen", unavailable: "Der Partnerlink wird gerade eingerichtet. Über das Kontaktformular informieren wir dich, sobald er aktiv ist." },
  },
}

export function AffiliateOfferLanding({ offer, isConfigured }: { offer: AffiliateOfferId; isConfigured: boolean }) {
  const { locale } = useLanguage()
  const item = content[offer]
  const copy = item[locale]
  const Icon = item.icon
  const goUrl = `/go/${offer}`

  return <main className="min-h-screen bg-slate-950 text-white"><section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">{copy.eyebrow}</p><div className="mt-5 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start"><div><h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">{copy.title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{copy.intro}</p><div className="mt-9 flex flex-wrap gap-3">{isConfigured ? <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-500"><a href={goUrl} onClick={() => track("affiliate_click", { offer, locale })}>{copy.cta}<ArrowRight data-icon="inline-end" /></a></Button> : <Button asChild size="lg" variant="secondary"><Link href="/uslugi">{locale === "bg" ? "Свържи се с нас" : "Kontakt aufnehmen"}<ArrowRight data-icon="inline-end" /></Link></Button>}<Link href="/produkte" className="inline-flex items-center px-4 text-sm font-semibold text-slate-300 hover:text-white">{locale === "bg" ? "Всички услуги" : "Alle Angebote"}</Link></div>{!isConfigured && <p className="mt-4 max-w-xl text-sm leading-6 text-amber-200">{copy.unavailable}</p>}</div><aside className="rounded-3xl border border-slate-700 bg-slate-900 p-7 shadow-2xl"><span className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300"><Icon className="size-6" /></span><h2 className="mt-6 text-xl font-semibold">{locale === "bg" ? "Как работи" : "So funktioniert es"}</h2><ol className="mt-5 space-y-4">{copy.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6 text-slate-200"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">{index + 1}</span>{step}</li>)}</ol></aside></div><div className="mt-14 grid gap-4 md:grid-cols-3">{copy.benefits.map((benefit) => <div key={benefit} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm leading-6 text-slate-200"><CheckCircle2 className="mb-3 size-5 text-blue-300" />{benefit}</div>)}</div><p className="mt-8 max-w-3xl border-l-2 border-amber-400 pl-4 text-sm leading-6 text-slate-300">{copy.caution}</p><p className="mt-5 text-xs text-slate-400">{locale === "bg" ? "Реклама / партньорска връзка. KintexBG може да получи възнаграждение при успешно реализирана услуга." : "Anzeige / Partnerlink. KintexBG kann bei erfolgreicher Vermittlung eine Vergütung erhalten."}</p></section></main>
}

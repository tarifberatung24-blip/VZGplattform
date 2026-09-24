"use client"

import { InsuranceCalculator, type InsuranceCalculatorCopy, type InsuranceCalculatorField } from "./insurance-calculator"
import type { Locale } from "@/lib/i18n/dictionaries"

const fields: Record<Locale, InsuranceCalculatorField[]> = {
  bg: [
    { id: "vehicle", label: "Марка и модел", type: "text", placeholder: "напр. VW Golf" },
    { id: "hsn", label: "HSN / TSN", type: "text", placeholder: "напр. 0603 / ABC" },
    { id: "firstRegistration", label: "Първа регистрация", type: "text", placeholder: "напр. 03/2019" },
    { id: "sfClass", label: "SF клас", type: "select", options: ["SF 1/2", "SF 1", "SF 2", "SF 3", "SF 4", "SF 5+"] },
    { id: "usage", label: "Начин на използване", type: "select", options: ["Частно", "Служебно", "Пътуване до работа"] },
    { id: "coverage", label: "Покритие за преглед при партньора", type: "select", options: ["Haftpflicht", "Teilkasko", "Vollkasko"] },
  ],
  de: [
    { id: "vehicle", label: "Marke und Modell", type: "text", placeholder: "z. B. VW Golf" },
    { id: "hsn", label: "HSN / TSN", type: "text", placeholder: "z. B. 0603 / ABC" },
    { id: "firstRegistration", label: "Erstzulassung", type: "text", placeholder: "z. B. 03/2019" },
    { id: "sfClass", label: "SF-Klasse", type: "select", options: ["SF 1/2", "SF 1", "SF 2", "SF 3", "SF 4", "SF 5+"] },
    { id: "usage", label: "Nutzung", type: "select", options: ["Privat", "Gewerblich", "Arbeitsweg"] },
    { id: "coverage", label: "Deckungsart für den Partnervergleich", type: "select", options: ["Haftpflicht", "Teilkasko", "Vollkasko"] },
  ],
}

const copy: Record<Locale, InsuranceCalculatorCopy> = {
  bg: {
    title: "Подготви данните за Kfz застраховка",
    intro:
      "Събери информацията за автомобила и избери коя категория покритие искаш да прегледаш при партньора. Тук не се изчислява цена и не се взема решение за приемане.",
    summaryTitle: "Твоите данни за преглед",
    summaryEmpty: "Попълни полетата, които искаш да подготвиш. Нищо не се изпраща или запазва.",
    limits:
      "Тази форма само подготвя данните за въвеждане. Не дава гарантирана премия, не гарантира приемане и не посочва „най-добър“ застраховател. Крайната цена и приемането се определят от застрахователя.",
    privacy: "Не въвеждай чувствителни данни за риска. Данните не се съхраняват и не се изпращат от HORIZON by VZG.",
    cta: "Сравни при партньора",
    unavailable: "Партньорската връзка за Kfz още не е настроена.",
  },
  de: {
    title: "Daten für die Kfz-Versicherung vorbereiten",
    intro:
      "Sammle die Fahrzeugdaten und wähle die Deckungsart, die du beim Partner ansehen möchtest. Hier wird kein Preis berechnet und keine Annahme entschieden.",
    summaryTitle: "Deine Angaben zur Kontrolle",
    summaryEmpty: "Fülle die Felder aus, die du vorbereiten möchtest. Nichts wird gesendet oder gespeichert.",
    limits:
      "Dieses Formular bereitet nur die Eingabedaten vor. Es nennt keinen garantierten Beitrag, garantiert keine Annahme und bezeichnet keinen „besten“ Versicherer. Endpreis und Annahme kommen vom Versicherer.",
    privacy: "Gib keine sensiblen Risikodaten ein. Die Angaben werden nicht gespeichert und nicht von HORIZON by VZG übermittelt.",
    cta: "Beim Partner vergleichen",
    unavailable: "Der Kfz-Partnerlink ist noch nicht konfiguriert.",
  },
}

export function KfzCalculator({ locale, isOffered }: { locale: Locale; isOffered: boolean }) {
  return (
    <InsuranceCalculator
      offerId="kfz"
      fields={fields[locale]}
      copy={copy[locale]}
      isOffered={isOffered}
    />
  )
}

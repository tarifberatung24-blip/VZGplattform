"use client"

import { InsuranceCalculator, type InsuranceCalculatorCopy, type InsuranceCalculatorField } from "./insurance-calculator"
import type { Locale } from "@/lib/i18n/dictionaries"

const fields: Record<Locale, InsuranceCalculatorField[]> = {
  bg: [
    { id: "industry", label: "Бранш / дейност", type: "text", placeholder: "напр. ресторантьорство" },
    { id: "legalForm", label: "Правна форма", type: "select", options: ["Едноличен търговец", "GmbH", "UG", "GbR", "Свободна професия"] },
    { id: "employees", label: "Брой служители", type: "number", placeholder: "напр. 4" },
    { id: "revenue", label: "Годишен оборот (ориентировъчно)", type: "select", options: ["до 50 000 €", "50 000 – 250 000 €", "250 000 – 1 млн. €", "над 1 млн. €"] },
    { id: "coverages", label: "Покрития за преглед при партньора", type: "select", options: ["Betriebshaftpflicht", "Inhaltsversicherung", "Rechtsschutz", "Комбинация"] },
    { id: "start", label: "Желан начален срок", type: "text", placeholder: "напр. 01/2026" },
  ],
  de: [
    { id: "industry", label: "Branche / Tätigkeit", type: "text", placeholder: "z. B. Gastronomie" },
    { id: "legalForm", label: "Rechtsform", type: "select", options: ["Einzelunternehmen", "GmbH", "UG", "GbR", "Freiberuflich"] },
    { id: "employees", label: "Anzahl Mitarbeitende", type: "number", placeholder: "z. B. 4" },
    { id: "revenue", label: "Jahresumsatz (orientierend)", type: "select", options: ["bis 50.000 €", "50.000 – 250.000 €", "250.000 – 1 Mio. €", "über 1 Mio. €"] },
    { id: "coverages", label: "Deckungen für die Anfrage beim Partner", type: "select", options: ["Betriebshaftpflicht", "Inhaltsversicherung", "Rechtsschutz", "Kombination"] },
    { id: "start", label: "Gewünschter Beginn", type: "text", placeholder: "z. B. 01/2026" },
  ],
}

const copy: Record<Locale, InsuranceCalculatorCopy> = {
  bg: {
    title: "Подготви данните за Firmenversicherung",
    intro:
      "Опиши накратко дейността и избери кои видове покритие искаш да прегледаш при партньора. HORIZON by VZG не е застраховател и не дава индивидуална застрахователна консултация.",
    summaryTitle: "Твоите данни за преглед",
    summaryEmpty: "Попълни полетата, които искаш да подготвиш. Нищо не се изпраща или запазва.",
    limits:
      "Тази форма само подготвя данните за въвеждане. Не дава гарантирана премия, не гарантира приемане и не посочва „най-добър“ застраховател. Крайната цена и приемането се определят от застрахователя.",
    privacy: "Не въвеждай чувствителни данни за риска. Данните не се съхраняват и не се изпращат от HORIZON by VZG.",
    cta: "Weiter zum Partner",
    unavailable: "Партньорската връзка за Firmenversicherung още не е настроена.",
  },
  de: {
    title: "Daten für die Firmenversicherung vorbereiten",
    intro:
      "Beschreibe kurz deine Tätigkeit und wähle, welche Deckungsarten du beim Partner ansehen möchtest. HORIZON by VZG ist kein Versicherer und gibt keine individuelle Versicherungsberatung.",
    summaryTitle: "Deine Angaben zur Kontrolle",
    summaryEmpty: "Fülle die Felder aus, die du vorbereiten möchtest. Nichts wird gesendet oder gespeichert.",
    limits:
      "Dieses Formular bereitet nur die Eingabedaten vor. Es nennt keinen garantierten Beitrag, garantiert keine Annahme und bezeichnet keinen „besten“ Versicherer. Endpreis und Annahme kommen vom Versicherer.",
    privacy: "Gib keine sensiblen Risikodaten ein. Die Angaben werden nicht gespeichert und nicht von HORIZON by VZG übermittelt.",
    cta: "Weiter zum Partner",
    unavailable: "Der Partnerlink für die Firmenversicherung ist noch nicht konfiguriert.",
  },
}

export function BusinessInsuranceCalculator({ locale, isOffered }: { locale: Locale; isOffered: boolean }) {
  return (
    <InsuranceCalculator
      offerId="business-insurance"
      fields={fields[locale]}
      copy={copy[locale]}
      isOffered={isOffered}
    />
  )
}

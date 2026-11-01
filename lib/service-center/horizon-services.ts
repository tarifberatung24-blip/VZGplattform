import type { ServiceEntry } from "./catalog"

export const horizonServiceCenterEntries: readonly ServiceEntry[] = [
  {
    id: "tarifberater24-wohnungsanmeldung", audience: ["personal"], category: "authorities", status: "login", href: "/zayavka?service=wohnungsanmeldung",
    name: { bg: "Wohnsitzanmeldung", de: "Wohnsitzanmeldung" },
    summary: { bg: "Безплатна подготовка и проверка на документите за Anmeldung.", de: "Kostenlose Vorbereitung und Prüfung der Unterlagen für die Anmeldung." },
    includes: { bg: ["Проверка на данните", "Подготовка на формуляра", "Списък с липсващи документи", "Одобрение преди външно действие"], de: ["Datenprüfung", "Formularvorbereitung", "Liste fehlender Unterlagen", "Bestätigung vor externer Aktion"] },
    terms: { bg: "Wohnsitz Anmeldung адрес преместване", de: "Wohnsitz Anmeldung Umzug Adresse" },
  },
  {
    id: "tarifberater24-abmeldung-ummeldung", audience: ["personal"], category: "authorities", status: "login", href: "/zayavka?service=abmeldung_ummeldung",
    name: { bg: "Abmeldung / Ummeldung", de: "Abmeldung / Ummeldung" },
    summary: { bg: "Безплатна класификация и подготовка при промяна на адрес.", de: "Kostenlose Einordnung und Vorbereitung bei einer Adressänderung." },
    includes: { bg: ["Проверка Abmeldung или Ummeldung", "Подготовка на формуляри", "Проверка на срокове", "Човешко одобрение преди подаване"], de: ["Prüfung Abmeldung oder Ummeldung", "Formularvorbereitung", "Fristenprüfung", "Menschliche Bestätigung vor Einreichung"] },
    terms: { bg: "отписване пререгистрация адрес", de: "Abmeldung Ummeldung Umzug" },
  },
  {
    id: "tarifberater24-steuererklaerung", audience: ["personal"], category: "tax", status: "login", href: "/zayavka?service=steuererklaerung",
    name: { bg: "Steuererklärung", de: "Steuererklärung" },
    summary: { bg: "Безплатна подготовка от потвърдени данни и документи, без автоматично подаване.", de: "Kostenlose Vorbereitung aus bestätigten Daten und Unterlagen, ohne automatische Übermittlung." },
    includes: { bg: ["Проверка на документите", "Подготовка на формуляри", "Маркиране на липси", "Без автоматично подаване през ELSTER"], de: ["Unterlagenprüfung", "Formularvorbereitung", "Markierung fehlender Angaben", "Keine automatische ELSTER-Übermittlung"] },
    terms: { bg: "данъчна декларация Steuer Finanzamt", de: "Steuererklärung Finanzamt Steuer" },
  },
  {
    id: "tarifberater24-krankenkassenwechsel", audience: ["personal"], category: "insurance", status: "login", href: "/zayavka?service=krankenkassenwechsel",
    name: { bg: "Krankenkassenwechsel", de: "Krankenkassenwechsel" },
    summary: { bg: "Безплатен план за сравнение и следващи стъпки при смяна на каса.", de: "Kostenloser Vergleichsplan und nächste Schritte beim Kassenwechsel." },
    includes: { bg: ["Структуриране на ситуацията", "Сравнителна подготовка", "Проверка на липсващи данни", "Без гаранция за икономия или приемане"], de: ["Strukturierung der Situation", "Vergleichsvorbereitung", "Prüfung fehlender Daten", "Keine Garantie für Ersparnis oder Annahme"] },
    terms: { bg: "здравна каса Krankenkasse осигуровки", de: "Krankenkasse Versicherung wechseln" },
  },
  {
    id: "tarifberater24-gewerbeanmeldung", audience: ["personal", "business"], category: "authorities", status: "login", href: "/zayavka?service=gewerbeanmeldung",
    name: { bg: "Gewerbeanmeldung", de: "Gewerbeanmeldung" },
    summary: { bg: "Безплатна подготовка на Gewerbeanmeldung и проверка за допълнителни разрешения.", de: "Kostenlose Vorbereitung der Gewerbeanmeldung und Prüfung weiterer Genehmigungen." },
    includes: { bg: ["Проверка на дейността", "Подготовка на формуляра", "Списък с липси", "Без гаранция за разрешение"], de: ["Prüfung der Tätigkeit", "Formularvorbereitung", "Liste fehlender Angaben", "Keine Genehmigungsgarantie"] },
    terms: { bg: "фирма Gewerbe бизнес регистрация", de: "Gewerbe anmelden Unternehmen" },
  },
  {
    id: "tarifberater24-fuehrerschein", audience: ["personal"], category: "authorities", status: "login", href: "/zayavka?service=fuehrerschein_umschreibung",
    name: { bg: "Führerschein Umschreibung", de: "Führerschein-Umschreibung" },
    summary: { bg: "Безплатна проверка на изискванията и документите за книжка.", de: "Kostenlose Prüfung der Voraussetzungen und Unterlagen für den Führerschein." },
    includes: { bg: ["Проверка на книжката", "Списък с нужните документи", "Проверка за превод", "Без гаранция за решение"], de: ["Prüfung des Führerscheins", "Erforderliche Unterlagen", "Prüfung einer Übersetzung", "Keine Entscheidungsgarantie"] },
    terms: { bg: "шофьорска книжка Führerschein превод", de: "Führerschein Umschreibung Übersetzung" },
  },
  {
    id: "tarifberater24-aufenthaltstitel", audience: ["personal"], category: "authorities", status: "login", href: "/zayavka?service=aufenthaltstitel",
    name: { bg: "Aufenthaltstitel", de: "Aufenthaltstitel" },
    summary: { bg: "Безплатна подготовка и маркиране на критичните липси при Aufenthaltstitel.", de: "Kostenlose Vorbereitung und Markierung kritischer Lücken beim Aufenthaltstitel." },
    includes: { bg: ["Проверка на изискванията", "Подготовка на заявление", "Маркиране на срокове", "Без гаранция за издаване"], de: ["Prüfung der Anforderungen", "Antragsvorbereitung", "Markierung von Fristen", "Keine Erteilungsgarantie"] },
    terms: { bg: "пребиваване Aufenthaltstitel Ausländerbehörde", de: "Aufenthaltstitel Ausländerbehörde Aufenthalt" },
  },
  {
    id: "tarifberater24-beglaubigungen", audience: ["personal", "business"], category: "documents", status: "login", href: "/zayavka?service=beglaubigungen_uebersetzungen",
    name: { bg: "Заверки и преводи", de: "Beglaubigungen & Übersetzungen" },
    summary: { bg: "Безплатна класификация на нуждата и подготовка за партньорски handoff.", de: "Kostenlose Einordnung des Bedarfs und Vorbereitung eines Partner-Handoffs." },
    includes: { bg: ["Проверка на предназначението", "Класификация превод или заверка", "Проверка на езиците", "Без автоматична поръчка"], de: ["Prüfung des Verwendungszwecks", "Einordnung Übersetzung oder Beglaubigung", "Sprachprüfung", "Keine automatische Bestellung"] },
    terms: { bg: "превод заверка легализация документ", de: "Übersetzung Beglaubigung Dokument" },
  },
]

import type { Locale } from "@/lib/i18n/dictionaries"

export type OnboardingCopy = {
  brand: string
  brandNote: string
  stepLabel: string
  back: string
  next: string
  toDashboard: string
  saving: string
  saveError: string
  language: { title: string; intro: string; label: string; hint: string }
  profile: { title: string; intro: string; firstName: string; lastName: string; required: string; optional: string }
  tour: { title: string; intro: string; items: { title: string; text: string }[] }
  finish: { title: string; intro: string; ready: string }
}

const tourItems = {
  bg: [
    { title: "Разбери документ", text: "Качи писмо или договор и виж какво означава на твоя език." },
    { title: "Отговори на институция", text: "Подготви отговор и го прегледай, преди да го изпратиш." },
    { title: "Попълни официален формуляр", text: "Попълни германски формуляр стъпка по стъпка." },
    { title: "Прекрати договор", text: "Подготви предизвестие по данните от договора." },
    { title: "Не знам какво да правя", text: "Започни от описанието на ситуацията си." },
  ],
  de: [
    { title: "Dokument verstehen", text: "Lade einen Brief oder Vertrag hoch und lies, was er bedeutet." },
    { title: "Behörde antworten", text: "Bereite eine Antwort vor und prüfe sie vor dem Versand." },
    { title: "Amtliches Formular ausfüllen", text: "Fülle ein deutsches Formular Schritt für Schritt aus." },
    { title: "Vertrag kündigen", text: "Bereite die Kündigung aus den Vertragsdaten vor." },
    { title: "Ich weiß nicht weiter", text: "Starte mit der Beschreibung deiner Situation." },
  ],
}

const copies: Record<Locale, OnboardingCopy> = {
  bg: {
    brand: "HORIZON by VZG",
    brandNote: "VZG CONSULT",
    stepLabel: "Първоначална настройка",
    back: "Назад",
    next: "Продължи",
    toDashboard: "Към таблото",
    saving: "Запазване…",
    saveError: "Промяната не можа да бъде запазена. Опитай отново.",
    language: {
      title: "Избери език",
      intro: "Този език се използва в приложението и в разговора с асистента.",
      label: "Език на приложението",
      hint: "Официалните документи винаги се създават на немски.",
    },
    profile: {
      title: "Малко за теб",
      intro: "Нужни са само име и език, за да започнем. Останалото може да добавиш по-късно.",
      firstName: "Име",
      lastName: "Фамилия",
      required: "Задължително",
      optional: "по избор",
    },
    tour: {
      title: "Какво можеш да правиш",
      intro: "Кратък преглед. Всичко остава достъпно и след това.",
      items: tourItems.bg,
    },
    finish: {
      title: "Готово",
      intro: "Профилът ти е настроен.",
      ready: "Отвори таблото и започни.",
    },
  },
  de: {
    brand: "HORIZON by VZG",
    brandNote: "VZG CONSULT",
    stepLabel: "Erste Einrichtung",
    back: "Zurück",
    next: "Weiter",
    toDashboard: "Zum Dashboard",
    saving: "Wird gespeichert…",
    saveError: "Die Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.",
    language: {
      title: "Sprache wählen",
      intro: "Diese Sprache gilt für die Anwendung und für das Gespräch mit dem Assistenten.",
      label: "Sprache der Anwendung",
      hint: "Amtliche Dokumente werden immer auf Deutsch erstellt.",
    },
    profile: {
      title: "Kurz zu dir",
      intro: "Für den Start genügen Name und Sprache. Alles Weitere kannst du später ergänzen.",
      firstName: "Vorname",
      lastName: "Nachname",
      required: "Pflichtfeld",
      optional: "optional",
    },
    tour: {
      title: "Was du tun kannst",
      intro: "Ein kurzer Überblick. Alles bleibt auch danach erreichbar.",
      items: tourItems.de,
    },
    finish: {
      title: "Fertig",
      intro: "Dein Profil ist eingerichtet.",
      ready: "Öffne das Dashboard und starte.",
    },
  },
}

export function getOnboardingCopy(locale: Locale): OnboardingCopy {
  return copies[locale] ?? copies.bg
}
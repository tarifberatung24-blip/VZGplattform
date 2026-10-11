import type { Locale } from "@/lib/i18n/dictionaries"

/**
 * Copy for the cookie notice shown right after sign-in.
 *
 * Facts it states, all from the privacy policy (components/marketing/legal-page.tsx):
 * only technically necessary storage is used; no marketing, analysis or affiliate
 * tracking is integrated at the moment; a later activation needs its own consent.
 * It deliberately makes no legal claim beyond that.
 *
 * Humanizer standard: no em or en dashes, no exclamation marks. A test locks these rules.
 */
export type CookieNoticeCopy = {
  title: string
  privacy: string
  imprint: string
  intro: string
  necessaryTitle: string
  necessaryBody: string
  optionalTitle: string
  optionalBody: string
  detailsOpen: string
  detailsClose: string
  alwaysOn: string
  understood: string
  onlyNecessary: string
  acceptAll: string
  save: string
  partnerTitle: string
  partnerBody: string
}

export const cookieNoticeCopy: Record<Locale, CookieNoticeCopy> = {
  bg: {
    title: "Твоите настройки за бисквитки",
    privacy: "Поверителност",
    imprint: "Импресум",
    intro:
      "HORIZON използва технически необходими бисквитки и локално съхранение, за да работят входът, езикът и външният вид. Без тях приложението не може да работи. Към момента не използваме бисквитки за реклама или анализ.",
    necessaryTitle: "Технически необходими",
    necessaryBody: "Вход и сесия, избран език, светла или тъмна тема и състояние на страничното меню.",
    optionalTitle: "Ако добавим още",
    optionalBody:
      "Ако добавим партньорско измерване, ще те попитаме отново и то ще се включи само с твоето съгласие. Подробности има в декларацията за поверителност.",
    detailsOpen: "Подробности",
    detailsClose: "По-малко",
    alwaysOn: "Винаги включени",
    understood: "Разбрах",
    onlyNecessary: "Само технически необходими",
    acceptAll: "Приеми всички",
    save: "Запази избора",
    partnerTitle: "Партньорски предложения и измерване",
    partnerBody: "Показва ни дали си стигнал до партньор през наш линк, за да отчитаме правилно препоръките.",
  },
  de: {
    title: "Deine Cookie-Einstellungen",
    privacy: "Datenschutz",
    imprint: "Impressum",
    intro:
      "HORIZON nutzt technisch notwendige Cookies und lokalen Speicher, damit Anmeldung, Sprache und Darstellung funktionieren. Ohne sie läuft die Anwendung nicht. Aktuell setzen wir keine Cookies für Werbung oder Analyse ein.",
    necessaryTitle: "Technisch notwendig",
    necessaryBody: "Anmeldung und Sitzung, gewählte Sprache, helles oder dunkles Design und Zustand des Seitenmenüs.",
    optionalTitle: "Falls wir mehr ergänzen",
    optionalBody:
      "Wenn wir eine Partner-Messung ergänzen, fragen wir dich erneut, und sie wird nur mit deiner Einwilligung aktiv. Mehr steht in der Datenschutzerklärung.",
    detailsOpen: "Details",
    detailsClose: "Weniger",
    alwaysOn: "Immer aktiv",
    understood: "Verstanden",
    onlyNecessary: "Nur technisch notwendige",
    acceptAll: "Alle annehmen",
    save: "Auswahl speichern",
    partnerTitle: "Partnerangebote und Messung",
    partnerBody: "Zeigt uns, ob du über einen unserer Links bei einem Partner gelandet bist, damit wir Empfehlungen richtig zuordnen.",
  },
}

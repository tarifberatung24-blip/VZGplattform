import type { Locale } from "@/lib/i18n/dictionaries"
import type { ForumOfficialTopic } from "./contract"

type ForumCopy = {
  eyebrow: string
  title: string
  intro: string
  rules: string
  composeTitle: string
  category: string
  community: string
  feedback: string
  postTitle: string
  postBody: string
  publish: string
  publishing: string
  published: string
  feedTitle: string
  empty: string
  official: string
  member: string
  pinned: string
  locked: string
  useful: string
  reacted: string
  comment: string
  reply: string
  send: string
  report: string
  reportHint: string
  reportReason: string
  reportSent: string
  announcementTitle: string
  announcementTopic: string
  publishAnnouncement: string
  forumAdministration: string
  hide: string
  show: string
  close: string
  open: string
  postFailed: string
  commentFailed: string
  actionFailed: string
  topic: Record<ForumOfficialTopic, string>
}

const copy: Record<Locale, ForumCopy> = {
  bg: {
    eyebrow: "Общност",
    title: "Forum",
    intro: "Споделяй опит, задай въпрос или помогни с практична информация за живота в Германия.",
    rules: "Не публикувай лични данни, документи, адреси, номера на случаи или правни съвети за конкретен човек.",
    composeTitle: "Нова публикация",
    category: "Тема",
    community: "Обсъждане",
    feedback: "Мнение за платформата",
    postTitle: "Заглавие",
    postBody: "Текст",
    publish: "Публикувай",
    publishing: "Публикува се…",
    published: "Публикацията е видима във форума.",
    feedTitle: "Последни публикации",
    empty: "Още няма публикации. Ти можеш да започнеш разговора.",
    official: "HORIZON by VZG",
    member: "Член на общността",
    pinned: "Важно",
    locked: "Коментарите са затворени",
    useful: "Полезно",
    reacted: "Отбелязано",
    comment: "коментар",
    reply: "Напиши коментар",
    send: "Изпрати",
    report: "Сигнал",
    reportHint: "Сигналът се вижда само от екипа за модерация.",
    reportReason: "Какъв е проблемът?",
    reportSent: "Сигналът е изпратен.",
    announcementTitle: "Официална информация",
    announcementTopic: "Категория",
    publishAnnouncement: "Публикувай информация",
    forumAdministration: "Модериране на Forum",
    hide: "Скрий",
    show: "Покажи",
    close: "Затвори",
    open: "Отвори",
    postFailed: "Публикацията не беше запазена. Провери текста и опитай отново.",
    commentFailed: "Коментарът не беше изпратен.",
    actionFailed: "Действието не беше изпълнено. Опитай отново.",
    topic: {
      platform: "Промяна в платформата",
      law: "Промяна в закона",
      promotion: "Реклама / партньорска информация",
      innovation: "Нова възможност",
    },
  },
  de: {
    eyebrow: "Community",
    title: "Forum",
    intro: "Teile Erfahrungen, stelle Fragen oder hilf mit praktischen Informationen zum Leben in Deutschland.",
    rules: "Bitte veröffentliche keine persönlichen Daten, Dokumente, Adressen, Aktenzeichen oder Rechtsberatung für einzelne Personen.",
    composeTitle: "Neuer Beitrag",
    category: "Thema",
    community: "Austausch",
    feedback: "Feedback zur Plattform",
    postTitle: "Titel",
    postBody: "Text",
    publish: "Veröffentlichen",
    publishing: "Wird veröffentlicht…",
    published: "Der Beitrag ist jetzt im Forum sichtbar.",
    feedTitle: "Aktuelle Beiträge",
    empty: "Noch gibt es keine Beiträge. Starte die Unterhaltung.",
    official: "HORIZON by VZG",
    member: "Community-Mitglied",
    pinned: "Wichtig",
    locked: "Kommentare sind geschlossen",
    useful: "Hilfreich",
    reacted: "Markiert",
    comment: "Kommentar",
    reply: "Kommentar schreiben",
    send: "Senden",
    report: "Melden",
    reportHint: "Die Meldung ist nur für das Moderationsteam sichtbar.",
    reportReason: "Was ist das Problem?",
    reportSent: "Die Meldung wurde gesendet.",
    announcementTitle: "Offizielle Information",
    announcementTopic: "Kategorie",
    publishAnnouncement: "Information veröffentlichen",
    forumAdministration: "Forum moderieren",
    hide: "Ausblenden",
    show: "Einblenden",
    close: "Schließen",
    open: "Öffnen",
    postFailed: "Der Beitrag wurde nicht gespeichert. Prüfe den Text und versuche es erneut.",
    commentFailed: "Der Kommentar wurde nicht gesendet.",
    actionFailed: "Die Aktion konnte nicht ausgeführt werden. Bitte versuche es erneut.",
    topic: {
      platform: "Änderung an der Plattform",
      law: "Gesetzesänderung",
      promotion: "Werbung / Partnerinformation",
      innovation: "Neue Möglichkeit",
    },
  },
}

export function getForumCopy(locale: Locale): ForumCopy {
  return copy[locale]
}

import type { BenefitAnswerKey } from "./types"

export type QuizQuestion = {
  key: BenefitAnswerKey
  titleDe: string
  titleBg: string
  helpDe: string
  helpBg: string
}

export const BENEFIT_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: "lives_in_germany",
    titleDe: "Lebst du dauerhaft in Deutschland?",
    titleBg: "Живееш ли постоянно в Германия?",
    helpDe: "Viele Leistungen setzen einen Wohnsitz oder gewöhnlichen Aufenthalt in Deutschland voraus.",
    helpBg: "Повечето помощи изискват местоживеене или обичайно пребиваване в Германия.",
  },
  {
    key: "has_children",
    titleDe: "Hast du Kinder (unter 18 oder in Ausbildung unter 25)?",
    titleBg: "Имаш ли деца (под 18 или в обучение под 25)?",
    helpDe: "Relevant für Kindergeld, Kinderzuschlag und Bildung & Teilhabe.",
    helpBg: "Релевантно за Kindergeld, Kinderzuschlag и Bildung & Teilhabe.",
  },
  {
    key: "children_in_household",
    titleDe: "Leben die Kinder in deinem Haushalt?",
    titleBg: "Живеят ли децата в твоето домакинство?",
    helpDe: "Wichtige Orientierungsfrage für Familienleistungen.",
    helpBg: "Важен ориентир за семейни помощи.",
  },
  {
    key: "pays_rent",
    titleDe: "Zahlst du Miete für deine Hauptwohnung?",
    titleBg: "Плащаш ли наем за основното си жилище?",
    helpDe: "Orientierung für Wohngeld — keine Mietberechnung.",
    helpBg: "Ориентация за Wohngeld — без изчисление на наема.",
  },
  {
    key: "income_tight_vs_costs",
    titleDe: "Reicht dein Haushaltseinkommen knapp für Miete und Lebenshaltung?",
    titleBg: "Доходът на домакинството едва ли стига за наем и живот?",
    helpDe: "Grobe Selbsteinschätzung — kein Einkommensnachweis.",
    helpBg: "Груба самооценка — не е доказателство за доход.",
  },
  {
    key: "has_earned_income",
    titleDe: "Hast du regelmäßig Erwerbseinkommen (Arbeit / Selbstständigkeit)?",
    titleBg: "Имаш ли редовен доход от работа / самостоятелна дейност?",
    helpDe: "Relevant u. a. für Kinderzuschlag-Orientierung.",
    helpBg: "Релевантно напр. за ориентация към Kinderzuschlag.",
  },
  {
    key: "little_or_no_work_income",
    titleDe: "Hast du derzeit wenig oder kein Einkommen aus Arbeit?",
    titleBg: "В момента имаш ли малко или никакъв доход от работа?",
    helpDe: "Orientierung für Grundsicherung / Bürgergeld — keine Berechnung.",
    helpBg: "Ориентация за Grundsicherung / Bürgergeld — без изчисление.",
  },
  {
    key: "receives_buergergeld",
    titleDe: "Erhältst du bereits Bürgergeld oder ähnliche Grundsicherung?",
    titleBg: "Получаваш ли вече Bürgergeld или сходна базова помощ?",
    helpDe: "Beeinflusst, welche weiteren Wohnleistungen sinnvoll zu prüfen sind.",
    helpBg: "Влияе кои жилищни помощи има смисъл да се проверят.",
  },
  {
    key: "is_single_parent",
    titleDe: "Erziehst du als Alleinerziehende/r?",
    titleBg: "Отглеждаш ли дете/деца като самотен родител?",
    helpDe: "Kann zusätzliche Prüfpfade für Familienleistungen nahelegen.",
    helpBg: "Може да насочи към допълнителни проверки за семейни помощи.",
  },
  {
    key: "pregnancy_or_infant",
    titleDe: "Bist du schwanger oder hast du ein Kind unter einem Jahr?",
    titleBg: "Бременна ли си или имаш ли дете под една година?",
    helpDe: "Orientierung für Elterngeld — keine Anspruchsberechnung.",
    helpBg: "Ориентация за Elterngeld — без изчисление на право.",
  },
]

/**
 * Deterministic benefit screening engine.
 *
 * PRINCIPLE: never invents official eligibility, euro amounts, or Behörden
 * decisions. Maps Yes/No answers to BenefitCheckState values with versioned
 * reason codes. Output is orientation only (POTENTIALLY_ELIGIBLE /
 * MORE_INFORMATION_REQUIRED / LIKELY_NOT_ELIGIBLE).
 */

import type { BenefitAnswers, BenefitId, BenefitResult } from "./types"

export const BENEFIT_ELIGIBILITY_RULE_VERSION = "be-2025.09.1"

const META: Record<
  BenefitId,
  {
    titleDe: string
    titleBg: string
    nextStepRoute: string
    officialInfoUrl: string
  }
> = {
  kindergeld: {
    titleDe: "Kindergeld",
    titleBg: "Kindergeld",
    nextStepRoute: "/kindergeld",
    officialInfoUrl: "https://www.arbeitsagentur.de/familie-und-kinder/kindergeld",
  },
  kinderzuschlag: {
    titleDe: "Kinderzuschlag",
    titleBg: "Kinderzuschlag",
    nextStepRoute: "/anspruch",
    officialInfoUrl: "https://www.arbeitsagentur.de/familie-und-kinder/kinderzuschlag-kiiz",
  },
  wohngeld: {
    titleDe: "Wohngeld",
    titleBg: "Wohngeld",
    nextStepRoute: "/anspruch",
    officialInfoUrl: "https://www.bmwsb.bund.de/Webs/BMWSB/DE/themen/stadt-wohnen/wohnraumfoerderung/wohngeld/wohngeld-node.html",
  },
  buergergeld: {
    titleDe: "Bürgergeld",
    titleBg: "Bürgergeld",
    nextStepRoute: "/anspruch",
    officialInfoUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/buergergeld",
  },
  elterngeld: {
    titleDe: "Elterngeld",
    titleBg: "Elterngeld",
    nextStepRoute: "/anspruch",
    officialInfoUrl: "https://familienportal.de/familienportal/familienleistungen/elterngeld",
  },
  bildung_und_teilhabe: {
    titleDe: "Bildung und Teilhabe",
    titleBg: "Bildung und Teilhabe",
    nextStepRoute: "/anspruch",
    officialInfoUrl: "https://www.bmas.de/DE/Arbeit/Grundsicherung-Buergergeld/Leistungen-und-Bedarfe/Bildung-und-Teilhabe/bildung-und-teilhabe.html",
  },
}

function result(
  benefitId: BenefitId,
  state: BenefitResult["state"],
  reasonCode: string,
  explanationDe: string,
  explanationBg: string
): BenefitResult {
  const meta = META[benefitId]
  return {
    benefitId,
    titleDe: meta.titleDe,
    titleBg: meta.titleBg,
    state,
    reasonCode,
    explanationDe,
    explanationBg,
    nextStepRoute: meta.nextStepRoute,
    officialInfoUrl: meta.officialInfoUrl,
  }
}

export function evaluateBenefitEligibility(answers: BenefitAnswers): BenefitResult[] {
  const results: BenefitResult[] = []

  // --- Kindergeld ---
  if (!answers.lives_in_germany) {
    results.push(
      result(
        "kindergeld",
        "LIKELY_NOT_ELIGIBLE",
        "no_germany_residence",
        "Ohne Wohnsitz/gewöhnlichen Aufenthalt in Deutschland ist Kindergeld in der Regel nicht der passende Prüfpfad.",
        "Без местоживеене/обичайно пребиваване в Германия Kindergeld обикновено не е подходящият път за проверка."
      )
    )
  } else if (answers.has_children && answers.children_in_household) {
    results.push(
      result(
        "kindergeld",
        "POTENTIALLY_ELIGIBLE",
        "children_in_germany_household",
        "Mit Kindern im Haushalt in Deutschland ist eine offizielle Kindergeld-Prüfung sinnvoll. Das ist keine Bewilligung.",
        "С деца в домакинството в Германия официална проверка за Kindergeld има смисъл. Това не е одобрение."
      )
    )
  } else if (answers.has_children) {
    results.push(
      result(
        "kindergeld",
        "MORE_INFORMATION_REQUIRED",
        "children_without_household_clarity",
        "Kinder sind angegeben, aber die Haushaltszuordnung ist unklar — weitere Angaben oder die Familienkasse sind nötig.",
        "Посочени са деца, но домакинството е неясно — нужни са още данни или Familienkasse."
      )
    )
  } else {
    results.push(
      result(
        "kindergeld",
        "LIKELY_NOT_ELIGIBLE",
        "no_children",
        "Ohne Kinder ist Kindergeld in diesem Screening nicht relevant.",
        "Без деца Kindergeld не е релевантен в този скрининг."
      )
    )
  }

  // --- Kinderzuschlag ---
  if (answers.lives_in_germany && answers.has_children && answers.has_earned_income && answers.income_tight_vs_costs && !answers.receives_buergergeld) {
    results.push(
      result(
        "kinderzuschlag",
        "POTENTIALLY_ELIGIBLE",
        "working_family_income_tight",
        "Erwerbseinkommen bei knappem Haushaltseinkommen legt eine Prüfung von Kinderzuschlag nahe — Beträge werden hier nicht berechnet.",
        "Доход от работа при стегнат бюджет насочва към проверка на Kinderzuschlag — суми тук не се изчисляват."
      )
    )
  } else if (answers.lives_in_germany && answers.has_children) {
    results.push(
      result(
        "kinderzuschlag",
        "MORE_INFORMATION_REQUIRED",
        "family_needs_income_detail",
        "Für Kinderzuschlag fehlen noch klare Signale zu Erwerbseinkommen und Bedarf — offizielle Rechner/Behörde nutzen.",
        "За Kinderzuschlag липсват ясни сигнали за доход и нужда — използвай официален калкулатор/учреждение."
      )
    )
  } else {
    results.push(
      result(
        "kinderzuschlag",
        "LIKELY_NOT_ELIGIBLE",
        "kinderzuschlag_preconditions_missing",
        "Die groben Vorbedingungen für Kinderzuschlag sind in deinen Antworten nicht erfüllt.",
        "Грубите предварителни условия за Kinderzuschlag не се покриват от отговорите ти."
      )
    )
  }

  // --- Wohngeld ---
  if (answers.receives_buergergeld) {
    results.push(
      result(
        "wohngeld",
        "LIKELY_NOT_ELIGIBLE",
        "buergergeld_housing_overlap_screen",
        "Bei laufendem Bürgergeld ist Wohngeld oft nicht der passende parallele Pfad — Wohnkosten laufen dort anders. Behörde fragen.",
        "При текущ Bürgergeld Wohngeld често не е паралелният път — жилищните разходи се третират иначе. Питай учреждението."
      )
    )
  } else if (answers.lives_in_germany && answers.pays_rent && answers.income_tight_vs_costs) {
    results.push(
      result(
        "wohngeld",
        "POTENTIALLY_ELIGIBLE",
        "rent_and_income_tight",
        "Miete plus knappes Einkommen: Wohngeld kann prüfenswert sein. Keine Miet- oder Zuschussberechnung hier.",
        "Наем плюс стегнат доход: Wohngeld може да си струва проверка. Тук няма изчисление на наем/помощ."
      )
    )
  } else if (answers.lives_in_germany && answers.pays_rent) {
    results.push(
      result(
        "wohngeld",
        "MORE_INFORMATION_REQUIRED",
        "rent_without_income_signal",
        "Du zahlst Miete, aber die Einkommenslage ist unklar — Wohngeld-Rechner der Kommune/des Bundes nutzen.",
        "Плащаш наем, но доходът е неясен — използвай калкулатора на общината/федерацията."
      )
    )
  } else {
    results.push(
      result(
        "wohngeld",
        "LIKELY_NOT_ELIGIBLE",
        "no_rent_signal",
        "Ohne Mietzahlung für die Hauptwohnung ist Wohngeld in diesem Screening nicht der Fokus.",
        "Без наем за основното жилище Wohngeld не е фокусът на този скрининг."
      )
    )
  }

  // --- Bürgergeld ---
  if (!answers.lives_in_germany) {
    results.push(
      result(
        "buergergeld",
        "LIKELY_NOT_ELIGIBLE",
        "no_germany_residence",
        "Ohne Deutschland-Bezug ist Bürgergeld hier nicht der passende Prüfpfad.",
        "Без връзка с Германия Bürgergeld не е подходящият път тук."
      )
    )
  } else if (answers.receives_buergergeld) {
    results.push(
      result(
        "buergergeld",
        "MORE_INFORMATION_REQUIRED",
        "already_receiving_review_needed",
        "Du erhältst bereits Grundsicherung — Änderungen der Lage mit dem Jobcenter klären, statt neu zu „qualifizieren“.",
        "Вече получаваш базова помощ — промени в ситуацията уточни с Jobcenter, вместо да „се квалифицираш“ наново."
      )
    )
  } else if (answers.little_or_no_work_income && answers.income_tight_vs_costs) {
    results.push(
      result(
        "buergergeld",
        "POTENTIALLY_ELIGIBLE",
        "low_or_no_income_screen",
        "Wenig/kein Erwerbseinkommen bei knapper Lage: Bürgergeld kann prüfenswert sein. Keine Bedarfsberechnung.",
        "Малко/никакъв трудов доход при стегната ситуация: Bürgergeld може да си струва проверка. Без изчисление на нужда."
      )
    )
  } else {
    results.push(
      result(
        "buergergeld",
        "MORE_INFORMATION_REQUIRED",
        "buergergeld_needs_full_means_test",
        "Bürgergeld braucht eine vollständige Bedürftigkeitsprüfung beim Jobcenter — dieses Quiz ersetzt sie nicht.",
        "Bürgergeld изисква пълна проверка на нуждата в Jobcenter — този квиз не я замества."
      )
    )
  }

  // --- Elterngeld ---
  if (answers.lives_in_germany && answers.pregnancy_or_infant) {
    results.push(
      result(
        "elterngeld",
        "POTENTIALLY_ELIGIBLE",
        "pregnancy_or_infant_in_germany",
        "Schwangerschaft oder Kind unter einem Jahr: Elterngeld-Prüfung ist sinnvoll. Keine Betragsberechnung.",
        "Бременност или дете под една година: проверка за Elterngeld има смисъл. Без изчисление на сума."
      )
    )
  } else if (answers.pregnancy_or_infant) {
    results.push(
      result(
        "elterngeld",
        "MORE_INFORMATION_REQUIRED",
        "elterngeld_residence_unclear",
        "Elterngeld hängt stark vom Wohnsitz und weiteren Voraussetzungen ab — offizielles Familienportal prüfen.",
        "Elterngeld зависи силно от местоживеенето и други условия — провери официалния Familienportal."
      )
    )
  } else {
    results.push(
      result(
        "elterngeld",
        "LIKELY_NOT_ELIGIBLE",
        "no_pregnancy_or_infant",
        "Ohne Schwangerschaft/Kleinkind ist Elterngeld in diesem Screening nicht relevant.",
        "Без бременност/бебе Elterngeld не е релевантен в този скрининг."
      )
    )
  }

  // --- Bildung und Teilhabe ---
  if (answers.lives_in_germany && answers.has_children && (answers.income_tight_vs_costs || answers.receives_buergergeld)) {
    results.push(
      result(
        "bildung_und_teilhabe",
        "POTENTIALLY_ELIGIBLE",
        "children_with_low_income_signal",
        "Bei Kindern und knapper Lage / Grundsicherung kann Bildung und Teilhabe prüfenswert sein.",
        "При деца и стегната ситуация / базова помощ Bildung und Teilhabe може да си струва проверка."
      )
    )
  } else if (answers.has_children) {
    results.push(
      result(
        "bildung_und_teilhabe",
        "MORE_INFORMATION_REQUIRED",
        "children_need_benefit_context",
        "Kinder sind vorhanden, aber die Einkommens-/Leistungslage ist unklar — Jobcenter/Kommune fragen.",
        "Има деца, но доходът/помощта е неясна — питай Jobcenter/общината."
      )
    )
  } else {
    results.push(
      result(
        "bildung_und_teilhabe",
        "LIKELY_NOT_ELIGIBLE",
        "no_children",
        "Ohne Kinder ist Bildung und Teilhabe hier nicht der Fokus.",
        "Без деца Bildung und Teilhabe не е фокусът тук."
      )
    )
  }

  return results
}

/** Prefer actionable screening outcomes for the results dashboard. */
export function actionableBenefitResults(results: BenefitResult[]): BenefitResult[] {
  return results.filter(
    (item) => item.state === "POTENTIALLY_ELIGIBLE" || item.state === "MORE_INFORMATION_REQUIRED"
  )
}

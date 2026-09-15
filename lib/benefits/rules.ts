import type { BenefitAnswers, EligibleBenefit } from "./types"

export const BENEFIT_RULES_VERSION = "2026-09-15"

export function calculateEligibleBenefits(answers: BenefitAnswers): EligibleBenefit[] {
  const results: EligibleBenefit[] = []

  if (answers.has_children && answers.children_under_18) {
    results.push({
      key: "kindergeld",
      title: "Kindergeld",
      shortLabel: "Детски надбавки",
      explanation: "Посочихте, че имате дете под 18 години. Това е основният първоначален критерий за Kindergeld; Familienkasse проверява допълнителните условия.",
      nextStep: "Проверете условията и подайте заявление до Familienkasse.",
      confidence: "likely",
    })
  }

  if (answers.pays_rent && (answers.monthly_income_under_1500 || answers.currently_unemployed)) {
    results.push({
      key: "wohngeld",
      title: "Wohngeld",
      shortLabel: "Жилищна помощ",
      explanation: "Комбинацията от разходи за наем и нисък или липсващ доход е сигнал за възможно право на Wohngeld. Точната сума зависи от домакинството, наема и общината.",
      nextStep: "Използвайте калкулатора на вашата община и подайте заявление до Wohngeldstelle.",
      confidence: "possible",
    })
  }

  if (answers.currently_unemployed && answers.monthly_income_under_1500) {
    results.push({
      key: "buergergeld",
      title: "Bürgergeld",
      shortLabel: "Основно обезпечение",
      explanation: "Посочихте безработица и доход под 1.500 €. Това може да отговаря на базовите критерии за нужда, но Jobcenter проверява имущество, домакинство и трудоспособност.",
      nextStep: "Свържете се с Jobcenter и подгответе доказателства за доходи, наем и имущество.",
      confidence: "possible",
    })
  }

  if (answers.has_children && answers.children_under_18 && answers.monthly_income_under_1500) {
    results.push({
      key: "kinderzuschlag",
      title: "Kinderzuschlag",
      shortLabel: "Добавка за деца",
      explanation: "Дете под 18 години в домакинство с нисък доход може да даде право на Kinderzuschlag, ако доходът покрива нуждите на родителя, но не и изцяло тези на децата.",
      nextStep: "Проверете доходния праг във Familienkasse и подайте заявление за Kinderzuschlag.",
      confidence: "possible",
    })
  }

  if (answers.has_children && answers.children_under_18 && answers.monthly_income_under_1500) {
    results.push({
      key: "bildung_und_teilhabe",
      title: "Bildung und Teilhabe",
      shortLabel: "Образование и участие",
      explanation: "При деца в домакинство с нисък доход може да има подкрепа за училищни материали, обяд, транспорт и участие в спорт или култура.",
      nextStep: "Попитайте общината или Jobcenter коя институция обработва заявлението.",
      confidence: "possible",
    })
  }

  if (answers.has_disability_or_special_needs) {
    results.push({
      key: "behindertenhilfe",
      title: "Unterstützung bei Behinderung",
      shortLabel: "Подкрепа при увреждане",
      explanation: "Посочихте увреждане или специални потребности. Възможните услуги зависят от степента на увреждане и конкретната нужда, например Eingliederungshilfe или други облекчения.",
      nextStep: "Потърсете местната Beratungsstelle или Versorgungsamt за индивидуална проверка.",
      confidence: "possible",
    })
  }

  return results
}

import type { BenefitAnswers, BenefitKey, EligibleBenefit } from "./benefits/types"

export const BENEFIT_ENGINE_VERSION = "2024-2025-kb-v2"

export type BenefitDecision = {
  benefits: EligibleBenefit[]
  eligibleBenefitKeys: BenefitKey[]
  reasoning: string
  missingData: string[]
}

const benefit = (value: EligibleBenefit): EligibleBenefit => value

export function evaluateBenefits(answers: BenefitAnswers): BenefitDecision {
  const benefits: EligibleBenefit[] = []
  const missingData: string[] = []

  if (answers.has_children && answers.children_under_18) {
    benefits.push(benefit({
      key: "kindergeld",
      title: "Kindergeld",
      shortLabel: "Детска помощ",
      explanation: "Дете под 18 години е screening сигнал за Kindergeld. Правото зависи допълнително от пребиваване, статут и фактическа грижа.",
      nextStep: "Проверете условията във Familienkasse и подгответе акт за раждане, Steuer-ID и доказателства за пребиваване.",
      confidence: "possible",
    }))
  }

  if (answers.has_children && answers.children_under_18 && answers.monthly_income_under_1500) {
    benefits.push(benefit({
      key: "kinderzuschlag",
      title: "Kinderzuschlag",
      shortLabel: "Добавка към Kindergeld",
      explanation: "Дете в домакинство с нисък доход може да е сигнал за Kinderzuschlag. Нужни са точни доходи за релевантния период, домакинство и получаван Kindergeld.",
      nextStep: "Използвайте KiZ-Lotse и подайте заявление до Familienkasse; максималната сума не е гарантирано плащане.",
      confidence: "possible",
    }))
    benefits.push(benefit({
      key: "bildung_und_teilhabe",
      title: "Bildung und Teilhabe",
      shortLabel: "Образование и участие",
      explanation: "Дете в домакинство с нисък доход може да има достъп до помощ за училищен обяд, транспорт, материали или участие.",
      nextStep: "Проверете местната община или Jobcenter според получаваната основна помощ.",
      confidence: "possible",
    }))
  }

  if (answers.pays_rent && answers.monthly_income_under_1500) {
    benefits.push(benefit({
      key: "wohngeld",
      title: "Wohngeld",
      shortLabel: "Жилищна помощ",
      explanation: "Комбинацията от наем и нисък доход е screening сигнал за Wohngeld. Точният резултат зависи от Haushaltsmitglieder, Mietstufe, признатия наем и всички доходи.",
      nextStep: "Проверете калкулатора на местната Wohngeldstelle и подгответе Mietvertrag, доходи и плащания.",
      confidence: "possible",
    }))
  }

  if (answers.currently_unemployed && answers.monthly_income_under_1500) {
    benefits.push(benefit({
      key: "buergergeld",
      title: "Bürgergeld",
      shortLabel: "Основно обезпечение",
      explanation: "Безработица и нисък доход са screening сигнал, но Jobcenter проверява Erwerbsfähigkeit, Bedarfsgemeinschaft, имущество и жилищни разходи.",
      nextStep: "Свържете се с Jobcenter и подгответе доказателства за доход, имущество, наем и статут на пребиваване.",
      confidence: "possible",
    }))
  }

  if (answers.has_disability_or_special_needs) {
    benefits.push(benefit({
      key: "behindertenhilfe",
      title: "Подкрепа при увреждане",
      shortLabel: "Индивидуална социална подкрепа",
      explanation: "Посоченото увреждане е сигнал за допълнителна проверка, но конкретната услуга зависи от GdB, нуждата и компетентния орган.",
      nextStep: "Потърсете Versorgungsamt или местна Beratungsstelle с наличните медицински и административни документи.",
      confidence: "possible",
    }))
  }

  if (!answers.has_children) missingData.push("възраст и статус на членовете на домакинството")
  if (answers.has_children) missingData.push("точен брой деца, възраст, обучение и кой фактически се грижи за тях")
  missingData.push("точни доходи за релевантния период, имущество и получавани помощи")
  if (answers.pays_rent) missingData.push("община, Mietstufe, признат наем и отопление")
  missingData.push("гражданство, дата и основание за пребиваване/работа в Германия")

  const reasoning = benefits.length
    ? `Предварителният screening откри ${benefits.length} възможни направления. Резултатът не доказва право или размер; институцията проверява документите и изключва несъвместими или двойно финансирани помощи. За следваща проверка са нужни: ${missingData.join("; ")}.`
    : `Отговорите не дадоха очевиден screening сигнал за тези четири основни помощи. Това не означава, че няма право на подкрепа. За по-пълен преглед са нужни: ${missingData.join("; ")}.`

  return {
    benefits,
    eligibleBenefitKeys: benefits.map((item) => item.key),
    reasoning,
    missingData,
  }
}

// Compatibility export for existing callers.
export const calculateEligibleBenefits = (answers: BenefitAnswers) => evaluateBenefits(answers).benefits

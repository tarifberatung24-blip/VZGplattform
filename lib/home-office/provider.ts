import type { DemoAnalysis } from "./types"

export const AI_PROVIDER_NOT_CONFIGURED = "AI_PROVIDER_NOT_CONFIGURED" as const

export function createDemoAnalysis(fileName: string): DemoAnalysis {
  return {
    documentType: "Bescheid (Demo)", sender: "Finanzamt Frankfurt (Demo)", recipient: "Demo-Kundin / Demo-Kunde", customerNumber: "DEMO-10482", contractNumber: "Nicht angegeben", referenceNumber: "FA-2026-0815", issueDate: "12.08.2026", receivedDate: "14.08.2026", deadline: "31.12.2026", amounts: ["1.250,00"], currency: "EUR",
    summaryBg: `Примерен резултат за демонстрация на ${fileName}. Това не е анализ на избрания документ.`, summaryDe: `Beispielergebnis für die Demonstration von ${fileName}. Dies ist keine Analyse des ausgewählten Dokuments.`,
    facts: [{ label: "Тип документ", value: "Bescheid (Demo)", confidence: 0.98 }, { label: "Референтен номер", value: "FA-2026-0815", confidence: 0.92 }, { label: "Краен срок", value: "31.12.2026", confidence: 0.87 }],
    risks: ["Срокът е примерен и трябва да бъде проверен в оригинала."], missingInformation: ["Оригиналното съдържание не се изпраща към AI доставчик."], recommendedNextSteps: ["Проверете данните в оригиналния документ.", "Редактирайте и потвърдете фактите локално."], confidence: 0.84, evidenceSnippets: ["DEMO EVIDENCE: примерен откъс, генериран локално."]
  }
}

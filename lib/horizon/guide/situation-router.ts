import type { GuideIntent } from "./intents"

export type SituationRecommendation = {
  intent: GuideIntent
  reason: "application" | "deadline" | "cancellation" | "document" | "unclear"
}

const signals: ReadonlyArray<{ intent: GuideIntent; reason: SituationRecommendation["reason"]; terms: readonly string[] }> = [
  { intent: "cancel_contract", reason: "cancellation", terms: ["kündig", "kuendig", "cancel", "прекрат", "отказ от договор"] },
  { intent: "reply_to_authority", reason: "deadline", terms: ["frist", "deadline", "termin", "antwort", "срок", "отговор"] },
  { intent: "fill_official_form", reason: "application", terms: ["kindergeld", "wohngeld", "bürgergeld", "antrag", "hilfe beantrag", "кандидат", "помощ", "заявлен"] },
  { intent: "understand_document", reason: "document", terms: ["brief", "schreiben", "bescheid", "dokument", "email", "e-mail", "писмо", "документ", "имейл"] },
]

/** A transparent, local first-pass router. It never determines eligibility or an official outcome. */
export function recommendGuideIntent(description: string): SituationRecommendation {
  const text = description.toLocaleLowerCase()
  for (const signal of signals) {
    if (signal.terms.some((term) => text.includes(term))) return { intent: signal.intent, reason: signal.reason }
  }
  return { intent: "unsure", reason: "unclear" }
}

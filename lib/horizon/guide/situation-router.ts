import type { GuideIntent } from "./intents"

export type SituationRecommendation = {
  intent: GuideIntent
  reason: "application" | "deadline" | "cancellation" | "document" | "energy" | "jobcenter" | "agentur" | "unclear"
  destination:
    | { kind: "guide_case" }
    | { kind: "contracts" }
    | { kind: "module"; module: "jobcenter" | "agentur_fuer_arbeit" }
}

const signals: ReadonlyArray<{
  intent: GuideIntent
  reason: SituationRecommendation["reason"]
  terms: readonly string[]
}> = [
  { intent: "cancel_contract", reason: "cancellation", terms: ["kündig", "kuendig", "cancel", "прекрат", "отказ от договор"] },
  { intent: "reply_to_authority", reason: "deadline", terms: ["frist", "deadline", "termin", "antwort", "срок", "отговор"] },
  { intent: "fill_official_form", reason: "application", terms: ["kindergeld", "wohngeld", "antrag", "hilfe beantrag", "кандидат", "заявлен"] },
  { intent: "understand_document", reason: "document", terms: ["brief", "schreiben", "bescheid", "dokument", "email", "e-mail", "писмо", "документ", "имейл"] },
]

const jobcenterTerms = ["jobcenter", "bürgergeld", "buergergeld", "grundsicherung", "джобцентър", "бюргергелд"]
const agenturTerms = ["arbeitsagentur", "arbeitsamt", "arbeitslosengeld", "arbeitslos", "agentur für arbeit", "агенция по заетостта"]
const energyTerms = ["strom", "gas", "electricity", "energie", "ток", "газ"]
const energySavingsTerms = ["tarif", "günstig", "guenstig", "billig", "wechsel", "anbieter", "sparen", "по-евтин", "доставчик", "спест"]

/**
 * A transparent, local first-pass router.
 *
 * Institution modules are shown only for explicit institution signals. Energy
 * goes to contracts only when both an energy topic and a saving/tariff signal
 * are present, so a high bill never gets silently mistaken for Jobcenter help.
 */
export function recommendGuideIntent(description: string): SituationRecommendation {
  const text = description.toLocaleLowerCase()

  if (jobcenterTerms.some((term) => text.includes(term))) {
    return { intent: "fill_official_form", reason: "jobcenter", destination: { kind: "module", module: "jobcenter" } }
  }
  if (agenturTerms.some((term) => text.includes(term))) {
    return { intent: "fill_official_form", reason: "agentur", destination: { kind: "module", module: "agentur_fuer_arbeit" } }
  }
  if (energyTerms.some((term) => text.includes(term)) && energySavingsTerms.some((term) => text.includes(term))) {
    return { intent: "unsure", reason: "energy", destination: { kind: "contracts" } }
  }

  for (const signal of signals) {
    if (signal.terms.some((term) => text.includes(term))) {
      return { intent: signal.intent, reason: signal.reason, destination: { kind: "guide_case" } }
    }
  }
  return { intent: "unsure", reason: "unclear", destination: { kind: "guide_case" } }
}

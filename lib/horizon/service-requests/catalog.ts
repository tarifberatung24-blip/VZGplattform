import type { ServiceRequestKind } from "@/lib/service-request"

export type HorizonServiceRequest = {
  kind: Extract<ServiceRequestKind,
    | "wohnungsanmeldung"
    | "abmeldung_ummeldung"
    | "steuererklaerung"
    | "krankenkassenwechsel"
    | "gewerbeanmeldung"
    | "fuehrerschein_umschreibung"
    | "aufenthaltstitel"
    | "beglaubigungen_uebersetzungen"
  >
  alphaAgent: "documents" | "finance-tax" | "social-benefits" | "quality-safety"
  category: "authorities" | "tax" | "insurance" | "mobility" | "documents"
  requiredEvidence: readonly string[]
  objectiveBg: string
  objectiveDe: string
}

export const horizonServiceRequests: readonly HorizonServiceRequest[] = [
  {
    kind: "wohnungsanmeldung",
    alphaAgent: "documents",
    category: "authorities",
    requiredEvidence: ["identity_document", "wohnungsgeberbestatigung", "new_address", "move_date"],
    objectiveBg: "Подготви Wohnsitzanmeldung, провери документите и следващата стъпка.",
    objectiveDe: "Wohnsitzanmeldung vorbereiten, Unterlagen prüfen und den nächsten Schritt festlegen.",
  },
  {
    kind: "abmeldung_ummeldung",
    alphaAgent: "documents",
    category: "authorities",
    requiredEvidence: ["identity_document", "move_type", "current_address", "new_address_or_foreign_destination"],
    objectiveBg: "Определи дали е нужна Abmeldung или Ummeldung и подготви заявката.",
    objectiveDe: "Prüfen, ob Abmeldung oder Ummeldung erforderlich ist, und die Anfrage vorbereiten.",
  },
  {
    kind: "steuererklaerung",
    alphaAgent: "finance-tax",
    category: "tax",
    requiredEvidence: ["tax_id", "tax_year", "income_records", "deductible_expenses"],
    objectiveBg: "Подготви Steuererklärung от потвърдени данни и документи без измислени данъчни резултати.",
    objectiveDe: "Steuererklärung aus bestätigten Daten und Unterlagen vorbereiten, ohne Steuerergebnisse zu erfinden.",
  },
  {
    kind: "krankenkassenwechsel",
    alphaAgent: "quality-safety",
    category: "insurance",
    requiredEvidence: ["current_health_insurer", "insurance_number", "employment_status", "switch_goal"],
    objectiveBg: "Подготви проверим план за Krankenkassenwechsel без гаранция за икономия или приемане.",
    objectiveDe: "Einen prüfbaren Plan für den Krankenkassenwechsel vorbereiten, ohne Ersparnis oder Annahme zu garantieren.",
  },
  {
    kind: "gewerbeanmeldung",
    alphaAgent: "documents",
    category: "authorities",
    requiredEvidence: ["identity_document", "business_activity", "business_address", "commercial_register_if_applicable"],
    objectiveBg: "Подготви Gewerbeanmeldung и провери дали са нужни допълнителни разрешения.",
    objectiveDe: "Gewerbeanmeldung vorbereiten und prüfen, ob weitere Genehmigungen erforderlich sind.",
  },
  {
    kind: "fuehrerschein_umschreibung",
    alphaAgent: "documents",
    category: "mobility",
    requiredEvidence: ["foreign_driving_licence", "identity_document", "nationality", "biometric_photo", "certified_translation_if_required"],
    objectiveBg: "Провери изискванията за Führerschein-Umschreibung и подготви документите.",
    objectiveDe: "Voraussetzungen für die Führerschein-Umschreibung prüfen und Unterlagen vorbereiten.",
  },
  {
    kind: "aufenthaltstitel",
    alphaAgent: "quality-safety",
    category: "authorities",
    requiredEvidence: ["passport", "current_residence_title", "residence_purpose", "expiry_date", "biometric_photo"],
    objectiveBg: "Подготви заявка за Aufenthaltstitel или Verlängerung и маркирай критичните липси.",
    objectiveDe: "Antrag für Aufenthaltstitel oder Verlängerung vorbereiten und kritische Lücken markieren.",
  },
  {
    kind: "beglaubigungen_uebersetzungen",
    alphaAgent: "documents",
    category: "documents",
    requiredEvidence: ["source_documents", "purpose", "source_language", "target_language"],
    objectiveBg: "Класифицирай нуждата от превод или заверка и подготви partner handoff без автоматична поръчка.",
    objectiveDe: "Bedarf für Übersetzung oder Beglaubigung klassifizieren und einen Partner-Handoff ohne automatische Bestellung vorbereiten.",
  },
]

export type HorizonServiceKind = HorizonServiceRequest["kind"]

export function isHorizonServiceRequestKind(value: ServiceRequestKind): value is HorizonServiceKind {
  return horizonServiceRequests.some((entry) => entry.kind === value)
}

export function getHorizonServiceRequest(kind: HorizonServiceKind): HorizonServiceRequest {
  const entry = horizonServiceRequests.find((item) => item.kind === kind)
  if (!entry) throw new Error(`UNKNOWN_HORIZON_SERVICE:${kind}`)
  return entry
}

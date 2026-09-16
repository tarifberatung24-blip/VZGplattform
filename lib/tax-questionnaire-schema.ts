export type TaxQuestionCategory = "personal_data" | "employment" | "commuting" | "home_office" | "advertising_expenses" | "children" | "vorsorgeaufwand" | "sonderausgaben" | "extraordinary_burdens" | "household_services" | "support_payments" | "double_household"
export type QuestionnaireFieldType = "text" | "number" | "date" | "boolean" | "select"
export type RequiredStatus = "REQUIRED" | "CONDITIONAL" | "OPTIONAL"
export type VerificationStatus = "VERIFIED" | "UNVERIFIED"

export type TaxQuestion = {
  question_id: string
  tax_year: 2025
  category: TaxQuestionCategory
  official_german_label: string
  bulgarian_question: string
  bulgarian_help: string
  why_required: string
  field_type: QuestionnaireFieldType
  required_status: RequiredStatus
  conditional_rule: string | null
  validation_rule: string | null
  source_form: string
  source_section: string | null
  source_page: number | null
  source_url: string | null
  source_id: string | null
  canonical_field: string | null
  verification_status: VerificationStatus
}

const fmsUrl = (id: string) => `https://www.formulare-bfinv.de/ffw/action/invoke.do?id=${id}`
const officialIndex = "https://finanzamt.thueringen.de/service/formulare/einkommensteuer/2025"

const verified = (question: Omit<TaxQuestion, "tax_year" | "bulgarian_help" | "why_required" | "verification_status">): TaxQuestion => ({
  ...question,
  tax_year: 2025,
  bulgarian_help: "Потвърдено чрез предоставения текстов extract от официалния FMS PDF за 2025 г.",
  why_required: "Полето е изписано в посочения официален формуляр и ред.",
  verification_status: "VERIFIED",
})

const unverified = (question: Omit<TaxQuestion, "tax_year" | "bulgarian_help" | "why_required" | "source_page" | "source_url" | "source_section" | "source_id" | "canonical_field" | "verification_status">): TaxQuestion => ({
  ...question,
  tax_year: 2025,
  bulgarian_help: "Официалният формуляр за 2025 г. трябва да бъде проверен преди използване.",
  why_required: "Ще бъде потвърдено само чрез официален източник за 2025 г.",
  source_section: null,
  source_page: null,
  source_url: null,
  source_id: null,
  canonical_field: null,
  verification_status: "UNVERIFIED",
})

export const taxQuestionnaire2025: TaxQuestion[] = [
  verified({ question_id: "personal-data-name", category: "personal_data", official_german_label: "Name", bulgarian_question: "Какво е името ви?", field_type: "text", required_status: "REQUIRED", conditional_rule: null, validation_rule: "non_empty", source_form: "034037_25", source_section: "Allgemeine Angaben · Zeile 9", source_page: 1, source_url: fmsUrl("034037_25"), source_id: "fms-034037_25", canonical_field: "taxpayer.name" }),
  verified({ question_id: "employment-lohnsteuerbescheinigung", category: "employment", official_german_label: "Bruttoarbeitslohn einschließlich Sachbezüge", bulgarian_question: "Какъв е брутният доход от труд, включително непаричните придобивки?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "employment_income", validation_rule: "non_negative", source_form: "034027_25", source_section: "Angaben zum Arbeitslohn · Zeile 5", source_page: 1, source_url: fmsUrl("034027_25"), source_id: "fms-034027_25", canonical_field: "employmentIncome.grossWages" }),
  verified({ question_id: "commuting-entfernungspauschale", category: "commuting", official_german_label: "Entfernungspauschale", bulgarian_question: "Какво е разстоянието до първото работно място за Entfernungspauschale?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "commuting_expenses", validation_rule: "non_negative", source_form: "034027_25", source_section: "Werbungskosten · Entfernungspauschale · Zeile 30", source_page: 2, source_url: fmsUrl("034027_25"), source_id: "fms-034027_25", canonical_field: "workRelatedExpenses.commuteDistanceKm" }),
  verified({ question_id: "home-office", category: "home_office", official_german_label: "Tagespauschale (bei beruflicher Tätigkeit im Homeoffice)", bulgarian_question: "Колко календарни дни сте работили от дома?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "home_office", validation_rule: "non_negative", source_form: "034027_25", source_section: "Tagespauschale · Zeilen 58–59", source_page: 3, source_url: fmsUrl("034027_25"), source_id: "fms-034027_25", canonical_field: "workRelatedExpenses.homeOfficeDays" }),
  verified({ question_id: "children", category: "children", official_german_label: "Angaben zum Kind", bulgarian_question: "Какви са идентификационният номер, името и датата на раждане на детето?", field_type: "text", required_status: "CONDITIONAL", conditional_rule: "has_children", validation_rule: "non_empty", source_form: "034025_25", source_section: "Angaben zum Kind · Zeilen 4–6", source_page: 1, source_url: fmsUrl("034025_25"), source_id: "fms-034025_25", canonical_field: "children.identity" }),
  unverified({ question_id: "werbungskosten", category: "advertising_expenses", official_german_label: "Werbungskosten", bulgarian_question: "Какви berufliche Aufwendungen трябва да бъдат проверени?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "employment_income", validation_rule: "non_negative", source_form: "034027_25" }),
  verified({ question_id: "vorsorge-rentenversicherung", category: "vorsorgeaufwand", official_german_label: "Beiträge zu gesetzlichen Rentenversicherungen", bulgarian_question: "Какви са внесените суми за задължително пенсионно осигуряване?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "has_insurance", validation_rule: "non_negative", source_form: "034098_25", source_section: "Beiträge zur Altersvorsorge · Zeile 6", source_page: 1, source_url: fmsUrl("034098_25"), source_id: "fms-034098_25-page-1-line-6", canonical_field: "insurance.statutoryPensionContributions" }),
  verified({ question_id: "vorsorge-health-insurance", category: "vorsorgeaufwand", official_german_label: "Arbeitnehmerbeiträge zu Krankenversicherungen laut Nr. 25 der Lohnsteuerbescheinigung", bulgarian_question: "Какви са служителските вноски за здравно осигуряване според т. 25 от удостоверението за данък върху заплатата?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "has_insurance", validation_rule: "non_negative", source_form: "034098_25", source_section: "Beiträge zur inländischen gesetzlichen Kranken- und Pflegeversicherung · Zeile 11", source_page: 1, source_url: fmsUrl("034098_25"), source_id: "fms-034098_25-page-1-line-11", canonical_field: "insurance.healthInsuranceContributions" }),
  verified({ question_id: "vorsorge-care-insurance", category: "vorsorgeaufwand", official_german_label: "Arbeitnehmerbeiträge zu sozialen Pflegeversicherungen laut Nr. 26 der Lohnsteuerbescheinigung", bulgarian_question: "Какви са служителските вноски за социално осигуряване за грижи според т. 26?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "has_insurance", validation_rule: "non_negative", source_form: "034098_25", source_section: "Beiträge zur inländischen gesetzlichen Kranken- und Pflegeversicherung · Zeile 13", source_page: 1, source_url: fmsUrl("034098_25"), source_id: "fms-034098_25-page-1-line-13", canonical_field: "insurance.longTermCareContributions" }),
  verified({ question_id: "sonderausgaben-church-tax", category: "sonderausgaben", official_german_label: "Kirchensteuer", bulgarian_question: "Каква църковна данъчна сума сте платили през 2025 г. и каква е била възстановена?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "has_special_expenses", validation_rule: "non_negative", source_form: "035006_25", source_section: "Kirchensteuer · Zeile 4", source_page: 1, source_url: fmsUrl("035006_25"), source_id: "fms-035006_25-page-1-line-4", canonical_field: "specialExpenses.churchTaxPaid" }),
  verified({ question_id: "sonderausgaben-donations-inland", category: "sonderausgaben", official_german_label: "Spenden und Mitgliedsbeiträge (ohne Spenden in das zu erhaltende Vermögen einer Stiftung) laut Bestätigungen laut Betriebsfinanzamt", bulgarian_question: "Каква е сумата на даренията и членските вноски към получатели в Германия според потвържденията?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "has_special_expenses", validation_rule: "non_negative", source_form: "035006_25", source_section: "Zuwendungen (Spenden und Mitgliedsbeiträge) · Zeile 5", source_page: 1, source_url: fmsUrl("035006_25"), source_id: "fms-035006_25-page-1-line-5", canonical_field: "specialExpenses.donationsInland" }),
  verified({ question_id: "extraordinary-disability", category: "extraordinary_burdens", official_german_label: "Grad der Behinderung", bulgarian_question: "Какъв е официално установеният ви процент на инвалидност (Grad der Behinderung)?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "has_extraordinary_burdens", validation_rule: "non_negative", source_form: "035007_25", source_section: "Behinderten-Pauschbetrag · Zeile 4", source_page: 1, source_url: fmsUrl("035007_25"), source_id: "fms-035007_25-page-1-line-4", canonical_field: "extraordinaryBurdens.disabilityDegree" }),
  verified({ question_id: "extraordinary-medical-costs", category: "extraordinary_burdens", official_german_label: "Krankheitskosten (z. B. Arzt- und Behandlungskosten, Arznei-, Heil- und Hilfsmittel, Kurkosten)", bulgarian_question: "Каква е общата сума на разходите за заболяване?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "has_extraordinary_burdens", validation_rule: "non_negative", source_form: "035007_25", source_section: "Andere Aufwendungen · Zeile 24", source_page: 2, source_url: fmsUrl("035007_25"), source_id: "fms-035007_25-page-2-line-24", canonical_field: "extraordinaryBurdens.medicalCosts" }),
  verified({ question_id: "household-minijob-costs", category: "household_services", official_german_label: "Aufwendungen (abzüglich Erstattungen)", bulgarian_question: "Какви са разходите за малка заетост (Minijob) в домакинството след възстановявания?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "has_household_services", validation_rule: "non_negative", source_form: "035009_25", source_section: "Geringfügige Beschäftigungen im Privathaushalt · Zeile 4", source_page: 1, source_url: fmsUrl("035009_25"), source_id: "fms-035009_25-page-1-line-4", canonical_field: "householdServices.minijobCosts" }),
  verified({ question_id: "household-handwerker-labor", category: "household_services", official_german_label: "darin enthaltene Lohnanteile, Maschinen- und Fahrtkosten inklusive Umsatzsteuer", bulgarian_question: "Каква е сумата за труд, машини и транспорт, включително ДДС, при ремонтни дейности?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "has_household_services", validation_rule: "non_negative", source_form: "035009_25", source_section: "Handwerkerleistungen · Zeile 6", source_page: 1, source_url: fmsUrl("035009_25"), source_id: "fms-035009_25-page-1-line-6", canonical_field: "householdServices.handwerkerLaborCosts" }),
  verified({ question_id: "support-period", category: "support_payments", official_german_label: "Unterstützungszeitraum, für den Unterhalt geleistet wurde", bulgarian_question: "За кой период сте предоставяли издръжка?", field_type: "date", required_status: "CONDITIONAL", conditional_rule: "has_support_payments", validation_rule: "valid_date", source_form: "034031_25", source_section: "Aufwendungen für den Unterhalt · Zeile 13", source_page: 1, source_url: fmsUrl("034031_25"), source_id: "fms-034031_25-page-1-line-13", canonical_field: "maintenancePayments.supportPeriod" }),
  verified({ question_id: "support-amount", category: "support_payments", official_german_label: "Höhe der Unterhaltszahlung – ohne Bargeldzahlung –", bulgarian_question: "Какъв е размерът на плащанията за издръжка без плащания в брой?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "has_support_payments", validation_rule: "non_negative", source_form: "034031_25", source_section: "Aufwendungen für den Unterhalt · Zeile 15", source_page: 1, source_url: fmsUrl("034031_25"), source_id: "fms-034031_25-page-1-line-15", canonical_field: "maintenancePayments.amount" }),
  verified({ question_id: "double-household-own-household", category: "double_household", official_german_label: "Es liegt ein eigener Hausstand am Lebensmittelpunkt vor", bulgarian_question: "Имате ли собствено домакинство в основното си местоживеене?", field_type: "boolean", required_status: "CONDITIONAL", conditional_rule: "double_household", validation_rule: null, source_form: "034027d_25", source_section: "Allgemeine Angaben · Zeile 9", source_page: 1, source_url: fmsUrl("034027d_25"), source_id: "fms-034027d_25-page-1-line-9", canonical_field: "doubleHousehold.hasOwnHousehold" }),
  verified({ question_id: "double-household-accommodation", category: "double_household", official_german_label: "Aufwendungen (z. B. Miete einschließlich Stellplatz- / Garagenkosten, Nebenkosten)", bulgarian_question: "Какви са разходите за настаняване на мястото на първата ви трудова дейност?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "double_household", validation_rule: "non_negative", source_form: "034027d_25", source_section: "Kosten der Unterkunft am Ort der ersten Tätigkeitsstätte · Zeile 23", source_page: 2, source_url: fmsUrl("034027d_25"), source_id: "fms-034027d_25-page-2-line-23", canonical_field: "doubleHousehold.accommodationCosts" }),
  verified({ question_id: "double-household-home-trips", category: "double_household", official_german_label: "einfache Entfernung in km (ohne Flugstrecken) / Anzahl der Familienheimfahrten", bulgarian_question: "Какво е еднопосочното разстояние и колко семейни пътувания до дома сте направили?", field_type: "number", required_status: "CONDITIONAL", conditional_rule: "double_household", validation_rule: "non_negative", source_form: "034027d_25", source_section: "Wöchentliche Familienheimfahrten · Zeile 17", source_page: 1, source_url: fmsUrl("034027d_25"), source_id: "fms-034027d_25-page-1-line-17", canonical_field: "doubleHousehold.familyHomeTravel" }),
]

export const verifiedTaxQuestions = taxQuestionnaire2025.filter((question) => question.verification_status === "VERIFIED")
export const verifiedConditionalRules = verifiedTaxQuestions.filter((question) => question.conditional_rule)
export function isApplicableTaxQuestion(question: TaxQuestion, answers: Record<string, unknown>) { return !question.conditional_rule || Boolean(answers[question.conditional_rule]) }
export const taxQuestionnaireAudit = { verifiedCount: verifiedTaxQuestions.length, unverifiedCount: taxQuestionnaire2025.length - verifiedTaxQuestions.length, missingMappings: taxQuestionnaire2025.filter((question) => !question.canonical_field).map((question) => question.question_id) }

export const taxQuestionnaireSourceAudit = { source: officialIndex, verifiedQuestionIds: verifiedTaxQuestions.map((question) => question.question_id), unverifiedQuestionIds: taxQuestionnaire2025.filter((question) => question.verification_status === "UNVERIFIED").map((question) => question.question_id) }

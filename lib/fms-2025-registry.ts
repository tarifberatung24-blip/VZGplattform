export type FormVerificationStatus = "VERIFIED" | "UNVERIFIED"

export type Fms2025Form = {
  formId: string
  officialGermanTitle: string
  bulgarianTitle: string
  taxYear: 2025
  fmsIdentifier: string | null
  officialFmsUrl: string | null
  sourceType: "form" | "instruction"
  transactionFamily: "EINKOMMENSTEUERERKLAERUNG" | "INFORMATION"
  applicability: "REQUIRED" | "CONDITIONAL" | "REFERENCE"
  verificationStatus: FormVerificationStatus
  officialSourceReference: string
}

const fmsBase = "https://www.formulare-bfinv.de/ffw/action/invoke.do?id="
const officialIndex = "https://finanzamt.thueringen.de/service/formulare/einkommensteuer/2025"

const manifestForms: Array<[string, string]> = [
  ["Hauptvordruck ESt 1 A", "034037_25"], ["Anlage Außergewöhnliche Belastungen", "035007_25"], ["Anlage Sonderausgaben", "035006_25"],
  ["Anlage Haushaltsnahe Aufwendungen", "035009_25"], ["Anlage Energetische Maßnahmen", "035010_25"], ["Anlage Sonstiges", "035008_25"],
  ["Anlage WA-ESt", "034138_25"], ["Anlage AUS", "034010_25"], ["Anlage AV", "034011_25"], ["Anlage KAP", "034024_25"],
  ["Anlage Kind", "034025_25"], ["Anlage N", "034027_25"], ["Anlage N-Doppelte Haushaltsführung", "034027d_25"], ["Anlage N-AUS", "034099_25"],
  ["Anlage N-Gre", "034049_25"], ["Anlage R", "034028_25"], ["Anlage R-AUS", "035011_25"], ["Anlage R-AV/bAV", "035012_25"],
  ["Anlage SO", "034029_25"], ["Anlage U", "034047_25"], ["Anlage Unterhalt", "034031_25"], ["Anlage V", "034032_25"],
  ["Anlage S", "034095_25"], ["Anlage Vorsorgeaufwand", "034098_25"], ["Anlage Mobilitätsprämie", "035014_25"],
]

const bgTitles: Record<string, string> = {
  "Hauptvordruck ESt 1 A": "Основен формуляр ESt 1 A", "Anlage N": "Приложение N — трудови доходи", "Anlage Kind": "Приложение Kind — деца",
  "Anlage Vorsorgeaufwand": "Приложение Vorsorgeaufwand — осигуровки", "Anlage Sonderausgaben": "Приложение Sonderausgaben — специални разходи",
  "Anlage Außergewöhnliche Belastungen": "Приложение за извънредни тежести", "Anlage Haushaltsnahe Aufwendungen": "Приложение за услуги в дома",
  "Anlage N-Doppelte Haushaltsführung": "Приложение N — двойно домакинство", "Anlage Unterhalt": "Приложение Unterhalt — издръжка",
}

const verifiedFormIds = new Set(["034098_25", "035006_25", "035007_25", "035009_25", "034031_25", "034027d_25"])

export const fms2025Registry: Fms2025Form[] = manifestForms.map(([title, id]) => ({
  formId: id.toLowerCase().replaceAll("_", "-"), officialGermanTitle: title, bulgarianTitle: bgTitles[title] ?? title,
  taxYear: 2025, fmsIdentifier: id, officialFmsUrl: `${fmsBase}${id}`, sourceType: "form",
  transactionFamily: "EINKOMMENSTEUERERKLAERUNG", applicability: title === "Hauptvordruck ESt 1 A" ? "REQUIRED" : "CONDITIONAL",
  verificationStatus: verifiedFormIds.has(id) ? "VERIFIED" : "UNVERIFIED", officialSourceReference: officialIndex,
}))

fms2025Registry.push({ formId: "anleitung-est-2025", officialGermanTitle: "Anleitung Einkommensteuererklärung 2025", bulgarianTitle: "Инструкция за данъчната декларация 2025", taxYear: 2025, fmsIdentifier: null, officialFmsUrl: null, sourceType: "instruction", transactionFamily: "INFORMATION", applicability: "REFERENCE", verificationStatus: "UNVERIFIED", officialSourceReference: officialIndex })

export const fms2025FormCount = fms2025Registry.length

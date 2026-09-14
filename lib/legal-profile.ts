type LegalProfile = {
  businessName: string
  representative: string
  street: string
  postalCode: string
  city: string
  country: string
  email: string
  phone: string
  vatId: string
  registerCourt: string
  registerNumber: string
  supervisoryAuthority: string
}

const publicDefaults = {
  businessName: "Tarifberater24",
  representative: "Inhaber: Svetlozar Gitsov",
  street: "Hospitalstraße 30",
  postalCode: "66798",
  city: "Wallerfangen",
  country: "Deutschland",
  email: "tarifberatung24@gmail.com",
  phone: "+49 157 50171967",
} as const

function value(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback
}

/**
 * Public business details for the legal pages. These values are intentionally
 * separate from application secrets and must be supplied in Vercel before a
 * commercial launch or affiliate application.
 */
export const legalProfile: LegalProfile = {
  businessName: value("LEGAL_BUSINESS_NAME", publicDefaults.businessName),
  representative: value("LEGAL_REPRESENTATIVE", publicDefaults.representative),
  street: value("LEGAL_STREET", publicDefaults.street),
  postalCode: value("LEGAL_POSTAL_CODE", publicDefaults.postalCode),
  city: value("LEGAL_CITY", publicDefaults.city),
  country: value("LEGAL_COUNTRY", publicDefaults.country),
  email: value("LEGAL_EMAIL", publicDefaults.email),
  phone: value("LEGAL_PHONE", publicDefaults.phone),
  vatId: value("LEGAL_VAT_ID"),
  registerCourt: value("LEGAL_REGISTER_COURT"),
  registerNumber: value("LEGAL_REGISTER_NUMBER"),
  supervisoryAuthority: value("LEGAL_SUPERVISORY_AUTHORITY"),
}

export const legalProfileMissing = [
  !legalProfile.businessName && "Unternehmensname / Name des Einzelunternehmens",
  !legalProfile.representative && "vertretungsberechtigte Person",
  !legalProfile.street && "Straße und Hausnummer",
  !legalProfile.postalCode && "Postleitzahl",
  !legalProfile.city && "Ort",
  !legalProfile.email && "Kontakt-E-Mail",
].filter(Boolean) as string[]

export function legalAddress() {
  return [legalProfile.businessName, legalProfile.representative, legalProfile.street, [legalProfile.postalCode, legalProfile.city].filter(Boolean).join(" "), legalProfile.country]
    .filter(Boolean)
}

export const affiliateOfferIds = ["business-insurance", "kfz", "energy", "credit", "schufa"] as const

export type AffiliateOfferId = (typeof affiliateOfferIds)[number]

/**
 * Product grouping for the public surfaces. `insurance` covers the insurance hub;
 * the other categories keep the pre-existing offers classified for future reuse.
 */
export const affiliateOfferCategories = ["insurance", "energy", "credit", "creditworthiness"] as const

export type AffiliateOfferCategory = (typeof affiliateOfferCategories)[number]

/**
 * Whether an offer may be presented as a live partner product.
 * `active` means approved for the public surface, `inactive` means a legacy or
 * unapproved entry that must not be offered, `planned` reserves the slot.
 */
export const affiliateOfferStatuses = ["active", "inactive", "planned"] as const

export type AffiliateOfferStatus = (typeof affiliateOfferStatuses)[number]

type OfferEnvName =
  | "AFFILIATE_BUSINESS_INSURANCE_URL"
  | "AFFILIATE_KFZ_URL"
  | "AFFILIATE_ENERGY_URL"
  | "AFFILIATE_CREDIT_URL"
  | "AFFILIATE_SCHUFA_URL"

type OfferConfig = {
  id: AffiliateOfferId
  envName: OfferEnvName
  category: AffiliateOfferCategory
  status: AffiliateOfferStatus
}

const configs: Record<AffiliateOfferId, OfferConfig> = {
  "business-insurance": {
    id: "business-insurance",
    envName: "AFFILIATE_BUSINESS_INSURANCE_URL",
    category: "insurance",
    status: "active",
  },
  kfz: { id: "kfz", envName: "AFFILIATE_KFZ_URL", category: "insurance", status: "active" },
  energy: { id: "energy", envName: "AFFILIATE_ENERGY_URL", category: "energy", status: "active" },
  credit: { id: "credit", envName: "AFFILIATE_CREDIT_URL", category: "credit", status: "active" },
  // No approved SCHUFA affiliate partner exists. The entry is kept only so the
  // legacy id and its environment variable stay resolvable; it must never be
  // presented as an active partner product.
  schufa: {
    id: "schufa",
    envName: "AFFILIATE_SCHUFA_URL",
    category: "creditworthiness",
    status: "inactive",
  },
}

function asSafeExternalUrl(value: string | undefined) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export function getAffiliateOffer(id: AffiliateOfferId) {
  const config = configs[id]
  const url = asSafeExternalUrl(process.env[config.envName])
  const isConfigured = Boolean(url)
  return {
    ...config,
    url,
    isConfigured,
    isActive: config.status === "active",
    // A product is only offered publicly when it is approved and a real
    // https deeplink is configured. Policy alone is not enough to offer it.
    isOffered: config.status === "active" && isConfigured,
  }
}

export function listAffiliateOffers() {
  return affiliateOfferIds.map(getAffiliateOffer)
}

export function listAffiliateOffersByCategory(category: AffiliateOfferCategory) {
  return listAffiliateOffers().filter((offer) => offer.category === category)
}

export function isAffiliateOfferId(value: string): value is AffiliateOfferId {
  return affiliateOfferIds.includes(value as AffiliateOfferId)
}

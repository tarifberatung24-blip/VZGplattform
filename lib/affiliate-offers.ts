export const affiliateOfferIds = ["schufa", "credit", "kfz", "energy"] as const

export type AffiliateOfferId = (typeof affiliateOfferIds)[number]

type OfferConfig = {
  id: AffiliateOfferId
  envName: "AFFILIATE_SCHUFA_URL" | "AFFILIATE_CREDIT_URL" | "AFFILIATE_KFZ_URL" | "AFFILIATE_ENERGY_URL"
}

const configs: Record<AffiliateOfferId, OfferConfig> = {
  schufa: { id: "schufa", envName: "AFFILIATE_SCHUFA_URL" },
  credit: { id: "credit", envName: "AFFILIATE_CREDIT_URL" },
  kfz: { id: "kfz", envName: "AFFILIATE_KFZ_URL" },
  energy: { id: "energy", envName: "AFFILIATE_ENERGY_URL" },
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
  return { ...config, url, isConfigured: Boolean(url) }
}

export function isAffiliateOfferId(value: string): value is AffiliateOfferId {
  return affiliateOfferIds.includes(value as AffiliateOfferId)
}

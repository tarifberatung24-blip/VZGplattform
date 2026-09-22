import { afterEach, describe, expect, it, vi } from "vitest"
import {
  affiliateOfferIds,
  getAffiliateOffer,
  isAffiliateOfferId,
  listAffiliateOffers,
  listAffiliateOffersByCategory,
} from "./affiliate-offers"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("affiliate offer registry", () => {
  it("exposes business-insurance and kfz as active insurance products", () => {
    vi.stubEnv("AFFILIATE_BUSINESS_INSURANCE_URL", "https://partner.example/business")
    vi.stubEnv("AFFILIATE_KFZ_URL", "https://partner.example/kfz")

    const outstanding = listAffiliateOffersByCategory("insurance")
    expect(outstanding.map((offer) => offer.id).sort()).toEqual(["business-insurance", "kfz"])
    for (const offer of outstanding) {
      expect(offer.status).toBe("active")
      expect(offer.isConfigured).toBe(true)
      expect(offer.isOffered).toBe(true)
    }
  })

  it("reads each offer from its own configured environment variable", () => {
    vi.stubEnv("AFFILIATE_BUSINESS_INSURANCE_URL", "https://partner.example/business")
    expect(getAffiliateOffer("business-insurance")).toMatchObject({
      envName: "AFFILIATE_BUSINESS_INSURANCE_URL",
      url: "https://partner.example/business",
      isConfigured: true,
    })
  })

  it("never presents schufa as an active or offered product", () => {
    vi.stubEnv("AFFILIATE_SCHUFA_URL", "https://partner.example/schufa")

    const schufa = getAffiliateOffer("schufa")
    expect(schufa.status).toBe("inactive")
    expect(schufa.isActive).toBe(false)
    // Even with a configured URL, an inactive product must not be offered.
    expect(schufa.isOffered).toBe(false)
    expect(listAffiliateOffers().filter((offer) => offer.isOffered).map((offer) => offer.id)).not.toContain("schufa")
  })

  it("is not offered when no https deeplink is configured", () => {
    for (const offer of listAffiliateOffers()) {
      expect(offer.isConfigured).toBe(false)
      expect(offer.isOffered).toBe(false)
    }
  })

  it("rejects a non-https deeplink instead of redirecting to it", () => {
    vi.stubEnv("AFFILIATE_KFZ_URL", "http://partner.example/kfz")
    expect(getAffiliateOffer("kfz").isConfigured).toBe(false)

    vi.stubEnv("AFFILIATE_KFZ_URL", "javascript:alert(1)")
    expect(getAffiliateOffer("kfz").isConfigured).toBe(false)

    vi.stubEnv("AFFILIATE_KFZ_URL", "not a url")
    expect(getAffiliateOffer("kfz").isConfigured).toBe(false)
  })

  it("keeps the legacy ids resolvable", () => {
    for (const id of ["schufa", "credit", "kfz", "energy"] as const) {
      expect(isAffiliateOfferId(id)).toBe(true)
    }
    expect(affiliateOfferIds).toContain("business-insurance")
  })

  it("rejects unknown offer ids", () => {
    expect(isAffiliateOfferId("business")).toBe(false)
    expect(isAffiliateOfferId("")).toBe(false)
    expect(isAffiliateOfferId("BUSINESS-INSURANCE")).toBe(false)
  })
})

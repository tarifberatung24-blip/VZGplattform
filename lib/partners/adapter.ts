/**
 * FinanzBG partner / affiliate adapter architecture.
 *
 * PRINCIPLE: FinanzBG never fabricates tariff prices, insurance offers, credit
 * offers, or savings. A partner connector may only return offers when it is
 * `approved` AND has the credentials/API it needs. Until then, the adapter
 * MUST return a `NOT_CONFIGURED` result — never a fake successful quote.
 *
 * This mirrors the `partners` / `affiliate_links` tables. Concrete connectors
 * (CHECK24, Tarifcheck24, energy brokerage, etc.) implement `ProviderAdapter`.
 */

export type IntegrationType =
  | "API"
  | "DEEPLINK"
  | "AFFILIATE_LINK"
  | "PARTNER_WIDGET"
  | "MANUAL_QUOTE"
  | "BROKER_FLOW"

export type PartnerCategory =
  | "STROM"
  | "GAS"
  | "INTERNET"
  | "MOBILFUNK"
  | "KFZ"
  | "HAFTPFLICHT"
  | "INSURANCE_OTHER"
  | "KREDIT"
  | "BANK"

export type PartnerConfig = {
  partnerId: string
  name: string
  integrationType: IntegrationType
  supportedCategories: PartnerCategory[]
  trackingMethod: string | null
  apiAvailable: boolean
  credentialsConfigured: boolean
  approved: boolean
  lastVerifiedAt: string | null
}

export type QuoteRequest = {
  category: PartnerCategory
  postalCode?: string
  annualConsumptionKwh?: number
  currentProvider?: string
  currentMonthlyCents?: number
  // Additional structured, user-confirmed fields as needed per category.
  extra?: Record<string, string | number>
}

export type VerifiedOffer = {
  partnerId: string
  category: PartnerCategory
  /** Data provenance: only ever PARTNER_VERIFIED for real offers. */
  provenance: "PARTNER_VERIFIED"
  title: string
  monthlyCents: number
  deeplinkUrl?: string
  disclosure: string
  verifiedAt: string
}

export type AdapterResult =
  | { status: "OK"; offers: VerifiedOffer[] }
  | { status: "DEEPLINK"; url: string; disclosure: string }
  | { status: "BROKER_FLOW"; message: string }
  | { status: "NOT_CONFIGURED"; reason: string }

export interface ProviderAdapter {
  readonly config: PartnerConfig
  /** Whether this adapter can currently return real, verified results. */
  isReady(): boolean
  getQuotes(request: QuoteRequest): Promise<AdapterResult>
}

/**
 * Base adapter enforcing the "no fabrication" guardrail. Subclasses override
 * `fetchQuotes` only; they can never be reached unless the partner is approved
 * and configured.
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
  constructor(readonly config: PartnerConfig) {}

  isReady(): boolean {
    if (!this.config.approved) return false
    if (this.config.integrationType === "API") return this.config.apiAvailable && this.config.credentialsConfigured
    if (this.config.integrationType === "BROKER_FLOW") return this.config.credentialsConfigured
    // DEEPLINK / AFFILIATE_LINK need approval only.
    return true
  }

  async getQuotes(request: QuoteRequest): Promise<AdapterResult> {
    if (!this.isReady()) {
      return {
        status: "NOT_CONFIGURED",
        reason: `Partner "${this.config.partnerId}" is not yet approved/configured for real quotes.`,
      }
    }
    return this.fetchQuotes(request)
  }

  protected abstract fetchQuotes(request: QuoteRequest): Promise<AdapterResult>
}
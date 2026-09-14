/** Universal data-confidence states (mirror of the DB `data_status` enum). */
export type DataStatus =
  | "USER_ENTERED"
  | "DOCUMENT_EXTRACTED"
  | "USER_CONFIRMED"
  | "SYSTEM_DERIVED"
  | "OFFICIAL_SOURCE_VERIFIED"
  | "PARTNER_VERIFIED"
  | "EXPIRED"
  | "UNVERIFIED"

/** Benefit eligibility discovery states (mirror of `benefit_check_state`). */
export type BenefitCheckState =
  | "POTENTIALLY_ELIGIBLE"
  | "MORE_INFORMATION_REQUIRED"
  | "LIKELY_NOT_ELIGIBLE"
  | "APPLICATION_READY"
  | "REQUIRES_AUTHORITY_REVIEW"

export type StatusKey = DataStatus | BenefitCheckState

type Tone = "neutral" | "info" | "success" | "warning" | "muted"

export const statusTone: Record<StatusKey, Tone> = {
  USER_ENTERED: "info",
  DOCUMENT_EXTRACTED: "info",
  USER_CONFIRMED: "success",
  SYSTEM_DERIVED: "neutral",
  OFFICIAL_SOURCE_VERIFIED: "success",
  PARTNER_VERIFIED: "success",
  EXPIRED: "muted",
  UNVERIFIED: "warning",
  POTENTIALLY_ELIGIBLE: "info",
  MORE_INFORMATION_REQUIRED: "warning",
  LIKELY_NOT_ELIGIBLE: "muted",
  APPLICATION_READY: "success",
  REQUIRES_AUTHORITY_REVIEW: "neutral",
}

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
}
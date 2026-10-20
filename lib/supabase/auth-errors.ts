export type AuthErrorCode =
  | "rate_limited"
  | "invalid_email"
  | "weak_password"
  | "email_unconfirmed"
  | "generic"

export function classifyAuthError(
  error: { message?: string; status?: number } | null | undefined,
): AuthErrorCode {
  const message = error?.message?.toLowerCase() ?? ""
  if (
    error?.status === 429
    || message.includes("rate_limit")
    || message.includes("rate limit")
    || message.includes("too many")
  ) return "rate_limited"
  if (message.includes("email_address_invalid") || message.includes("invalid email")) return "invalid_email"
  if (message.includes("password")) return "weak_password"
  if (message.includes("confirm") || message.includes("not confirmed")) return "email_unconfirmed"
  return "generic"
}

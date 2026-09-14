export function normalizeGermanMobile(value: string) {
  const compact = value.replace(/[^0-9+]/g, "")
  const digits = compact.startsWith("+") ? compact.slice(1).replace(/\+/g, "") : compact.replace(/\+/g, "")

  if (compact.startsWith("+")) return `+${digits}`
  if (digits.startsWith("00")) return `+${digits.slice(2)}`
  if (digits.startsWith("49")) return `+${digits}`
  if (digits.startsWith("0")) return `+49${digits.slice(1)}`
  return `+49${digits}`
}

export function isGermanMobile(value: string) {
  return /^\+49(?:15|16|17)\d{8,9}$/.test(value)
}

export function isSupportedMobile(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value)
}

export function phoneAuthMessage(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("rate") || lower.includes("too many")) return "Zu viele Versuche. Bitte warte kurz und versuche es später erneut."
  if (lower.includes("expired") || lower.includes("invalid") || lower.includes("otp")) return "Der Code ist falsch oder abgelaufen. Bitte fordere einen neuen Code an."
  if (lower.includes("signup") || lower.includes("phone")) return "Die SMS-Registrierung ist derzeit nicht verfügbar. Bitte prüfe die Phone-Einstellungen in Supabase und versuche es später erneut."
  return "Die SMS-Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut."
}

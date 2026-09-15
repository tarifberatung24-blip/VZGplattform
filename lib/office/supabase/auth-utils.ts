export function safeNextPath(value: string | null, fallback = '/bg') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('://')) return fallback
  return value
}

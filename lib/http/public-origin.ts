/**
 * Public origin of the request. Behind Render's proxy `request.url` carries the
 * internal address (http://localhost:10000), so redirects built from it send
 * users to a dead host. Prefer the forwarded headers set by the proxy.
 */
export function publicOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!host) return new URL(request.url).origin
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
  const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : isLocal ? "http" : "https"
  return `${proto}://${host}`
}

export function publicUrl(path: string, request: Request): URL {
  return new URL(path, publicOrigin(request))
}

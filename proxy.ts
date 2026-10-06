import { updateSession } from "./lib/supabase/proxy"
import { NextRequest, NextResponse } from "next/server"
import { defaultLocale, isLocale, LOCALE_COOKIE_KEY, stripLocale } from "./lib/i18n/routing"
import { legacyRedirectTarget } from "./lib/navigation/legacy-redirects"
import { isAffiliateOfferId } from "./lib/affiliate-offers"

const localizedStaticPaths = new Set([
  "/", "/anspruch", "/kindergeld", "/za-nas", "/vertraege", "/documents", "/auth/login",
  "/auth/sign-up", "/auth/sign-up-success", "/auth/error", "/auth/forgot-password",
  "/auth/update-password", "/auth/mfa-verify", "/finanzamt", "/profil", "/dashboard",
  "/protected", "/assistant", "/konto/sicherheit", "/steuer", "/steuer/providers", "/steuer/review",
  "/finanzbildung", "/datenschutz", "/agb", "/impressum", "/contact", "/how-it-works",
  "/affiliate-hinweis", "/widerruf", "/app", "/functions", "/anfrage", "/zayavka",
  "/email-generator", "/pruefung", "/security", "/versicherungen",
])

function isKnownLocalizedPath(pathname: string) {
  const [, locale, ...segments] = pathname.split("/")
  if (!isLocale(locale)) return true
  const path = `/${segments.join("/")}`
  if (localizedStaticPaths.has(path)) return true
  if (segments[0] === "angebote" && segments.length === 2) return isAffiliateOfferId(segments[1])
  if (segments[0] === "go" && segments.length === 2) return isAffiliateOfferId(segments[1])
  if (segments[0] === "guide" && (segments.length === 1 || segments.length === 2)) return true
  if (segments[0] === "onboarding" && ["profile", "tour", "finish"].includes(segments[1] ?? "")) return true
  return false
}

function localizedNotFound(locale: string) {
  const german = locale === "de"
  const title = german ? "Seite nicht gefunden" : "Страницата не е намерена"
  const home = german ? "Zur Startseite" : "Към началната страница"
  const body = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${title}</title></head><body><main><h1>${title}</h1><a href="/${locale}">${home}</a></main></body></html>`
  return new NextResponse(body, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } })
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const segment = pathname.split("/")[1]
  const authPath = stripLocale(pathname)

  // Route handlers live outside the localized page tree. Preserve the query
  // string and HTTP method when recovering a previously localized auth URL.
  if (authPath === "/auth/callback" || authPath === "/auth/logout") {
    if (isLocale(segment)) {
      const url = request.nextUrl.clone()
      url.pathname = authPath
      return NextResponse.redirect(url, 307)
    }
    return await updateSession(request)
  }

  if (authPath === "/protected") {
    const url = request.nextUrl.clone()
    url.pathname = isLocale(segment) ? `/${segment}/dashboard` : "/dashboard"
    url.search = ""
    return NextResponse.redirect(url, 308)
  }

  // N7 legacy redirects. Applied before the localized catch-all can render the obsolete surface,
  // so a bookmarked legacy URL lands on its canonical destination instead of the legacy page. The
  // target is re-prefixed with the resolved locale, and any query string is dropped because the
  // legacy surfaces used it for view state that the canonical route does not accept.
  const legacyTarget = legacyRedirectTarget(pathname)
  if (legacyTarget) {
    const url = request.nextUrl.clone()
    url.pathname = isLocale(segment) ? `/${segment}${legacyTarget}` : legacyTarget
    url.search = ""
    return NextResponse.redirect(url, 308)
  }

  if (isLocale(segment)) {
    if (!isKnownLocalizedPath(pathname)) return localizedNotFound(segment)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-locale", segment)
    const localizedRequest = new NextRequest(request, { headers: requestHeaders })
    const response = await updateSession(localizedRequest)
    response.cookies.set(LOCALE_COOKIE_KEY, segment, { path: "/", maxAge: 31536000, sameSite: "lax" })
    return response
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return await updateSession(request)
  }

  const locale = request.cookies.get(LOCALE_COOKIE_KEY)?.value
  const resolvedLocale = isLocale(locale) ? locale : defaultLocale
  const url = request.nextUrl.clone()
  url.pathname = `/${resolvedLocale}${pathname === "/" ? "" : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

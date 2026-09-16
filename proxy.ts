import { updateSession } from "./lib/supabase/proxy"
import { NextRequest, NextResponse } from "next/server"
import { defaultLocale, isLocale, LOCALE_COOKIE_KEY, stripLocale } from "./lib/i18n/routing"

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

  if (isLocale(segment)) {
    const response = await updateSession(request)
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

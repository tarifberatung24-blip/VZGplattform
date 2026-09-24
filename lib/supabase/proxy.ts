import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig, hasSupabaseConfig, missingConfigurationMessage } from './config'
import { isProtectedAppPath, isOnboardingComplete, isKnownOnboardingStep, normalizeOnboardingStep, isOnboardingPath, isAuthFlowPath, pathLocale, requiresMfa } from './auth-routing'
import { stripLocale } from '../i18n/routing'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  if (!hasSupabaseConfig()) {
    const pathname = request.nextUrl.pathname
    const isPublicApi = pathname === "/api/health"
    const isPublicPage = !isProtectedAppPath(pathname) && !pathname.startsWith("/api")
    if (isPublicApi || isPublicPage) return supabaseResponse
    console.error(`[supabase-config] ${missingConfigurationMessage}`)
    return NextResponse.json({ code: "SUPABASE_NOT_CONFIGURED" }, {
      status: 503,
    })
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const { url, key } = getSupabaseConfig()
  const supabase = createServerClient(
    url,
    key,
    {
      // Secure cookies in production; not in dev, so localhost still works.
      cookieOptions: { secure: process.env.NODE_ENV === 'production' },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtectedAppPath(request.nextUrl.pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = ''
    url.searchParams.set('next', `${stripLocale(request.nextUrl.pathname)}${request.nextUrl.search}`)
    return NextResponse.redirect(url)
  }

  if (isProtectedAppPath(request.nextUrl.pathname) && user) {
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (requiresMfa(assurance?.currentLevel, assurance?.nextLevel)) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/mfa-verify'
      url.search = ''
      url.searchParams.set('next', `${stripLocale(request.nextUrl.pathname)}${request.nextUrl.search}`)
      return NextResponse.redirect(url)
    }
  }

  // First-login gate. A user who has not finished onboarding is held in the
  // onboarding flow; a user who has finished never sees it again.
  //
  // Skipped for auth-flow routes (account recovery, MFA) so those stay reachable,
  // and best-effort only: the step is used to build the redirect only when it is a
  // known step, and an unreadable step leaves the request untouched. A transient
  // failure must never lock a user out. The onboarding routes and every
  // authenticated page re-apply the same rule server-side.
  if (user && !isOnboardingPath(request.nextUrl.pathname) && !isAuthFlowPath(request.nextUrl.pathname)) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('onboarding_step')
      .eq('id', user.id)
      .maybeSingle()

    // Record an unreadable state without the user id, the row, or any profile
    // content. Only a coarse reason and the DB error code are kept, and the
    // request is allowed through so the session cannot be trapped here.
    if (error) {
      console.warn('[onboarding-gate] step unreadable; allowing request', {
        reason: 'query_failed',
        code: error.code ?? 'unknown',
      })
    } else if (!profile) {
      console.warn('[onboarding-gate] no profile row; allowing request', { reason: 'no_profile' })
    } else if (!isKnownOnboardingStep(profile.onboarding_step)) {
      console.warn('[onboarding-gate] unrecognised step; allowing request', { reason: 'malformed_step' })
    }

    if (profile && isKnownOnboardingStep(profile.onboarding_step) && !isOnboardingComplete(profile.onboarding_step)) {
      const step = normalizeOnboardingStep(profile.onboarding_step)
      if (step) {
        const url = request.nextUrl.clone()
        url.pathname = `/${pathLocale(request.nextUrl.pathname)}/onboarding/${step}`
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

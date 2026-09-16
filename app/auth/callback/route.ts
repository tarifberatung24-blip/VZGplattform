import { createClient } from '@/lib/supabase/server'
import { requiresMfa, sanitizeNextPath } from '@/lib/supabase/auth-routing'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'), '/')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (requiresMfa(assurance?.currentLevel, assurance?.nextLevel)) {
        const url = new URL('/auth/mfa-verify', origin)
        url.searchParams.set('next', next)
        return NextResponse.redirect(url)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}

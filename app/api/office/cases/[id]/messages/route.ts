import { NextResponse } from 'next/server'
import { addCaseMessage } from '@/lib/office/repositories/case-detail'
import { locales } from '@/lib/office/locales'
import type { Locale } from '@/lib/office/supabase/database'
import { routeCaseMessage } from '@/lib/office/workflow/routing'
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const body = await request.json().catch(() => null) as { locale?: unknown; content?: unknown } | null; const content = typeof body?.content === 'string' ? body.content : ''; const locale = locales.includes(body?.locale as Locale) ? body?.locale as Locale : 'bg'; const result = await addCaseMessage(id, { role:'user', locale, content }); if ('error' in result) return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 400 }); const routing = await routeCaseMessage(id, content); return NextResponse.json({ ...result, routing }, { status: 201 }) }

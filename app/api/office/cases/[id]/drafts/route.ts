import { NextResponse } from 'next/server'
import { listDrafts } from '@/lib/office/workflow/records'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const result = await listDrafts(id); return NextResponse.json(result, { status: 'error' in result ? (result.error === 'Unauthorized' ? 401 : 404) : 200 }) }

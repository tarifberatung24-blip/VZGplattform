import { NextResponse } from 'next/server'
import { approveDraft } from '@/lib/office/workflow/records'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const body = await request.json().catch(() => null) as { approvedHash?: unknown } | null; if (typeof body?.approvedHash !== 'string' || !/^[a-f0-9]{64}$/.test(body.approvedHash)) return NextResponse.json({ error:'A valid approved content hash is required' }, { status:400 }); const result = await approveDraft(id, body.approvedHash); return NextResponse.json(result, { status:'error' in result ? 400 : 201 }) }

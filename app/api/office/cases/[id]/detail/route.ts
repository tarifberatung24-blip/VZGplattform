import { NextResponse } from 'next/server'
import { getCaseDetail } from '@/lib/office/repositories/case-detail'
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const result = await getCaseDetail(id); if (!('caseRecord' in result)) return NextResponse.json(result, { status: result.error === 'Unauthorized' ? 401 : 404 }); return NextResponse.json(result) }

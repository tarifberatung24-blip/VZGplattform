import { NextResponse } from 'next/server'
import { signedOwnedDocumentUrl } from '@/lib/office/workflow/documents'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const result = await signedOwnedDocumentUrl(id); return NextResponse.json(result, { status: 'error' in result ? (result.error === 'Unauthorized' ? 401 : 404) : 200 }) }

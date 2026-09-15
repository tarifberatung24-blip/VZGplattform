import { NextResponse } from 'next/server'
import { ocrOwnedImageDocument } from '@/lib/office/workflow/documents'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await ocrOwnedImageDocument(id)
  const status = 'error' in result ? (result.error === 'Unauthorized' ? 401 : 400) : 200
  return NextResponse.json(result, { status })
}

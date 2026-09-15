import { NextResponse } from 'next/server'
import { uploadOwnedDocument } from '@/lib/office/workflow/documents'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const form = await request.formData(); const file = form.get('file'); if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 }); const result = await uploadOwnedDocument(id, file); return NextResponse.json(result, { status: 'error' in result ? (result.error === 'Unauthorized' ? 401 : 400) : 201 }) }

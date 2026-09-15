import { createHash, randomUUID } from 'node:crypto'
import { createAdminClient } from '../supabase/admin'
import { getAuthenticatedUser } from '../supabase/auth'
import { writeAuditEvent } from '../supabase/audit'
import { extractPdfPages } from './pdf-extraction'
import { ocrScannedPdfPages } from './pdf-ocr'
import { TesseractOcrProvider } from './ocr-provider'

const BUCKET = 'source-documents'
const MAX_BYTES = 10 * 1024 * 1024
const MIME = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const safeName = (name: string) => name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'document'

export async function uploadOwnedDocument(caseId: string, file: File) {
  const { user } = await getAuthenticatedUser(); if (!user) return { error: 'Unauthorized' as const }
  const admin = createAdminClient(); if (!admin) return { error: 'Supabase is not configured' as const }
  if (!MIME.has(file.type)) return { error: 'Unsupported document type' as const }
  if (file.size < 1 || file.size > MAX_BYTES) return { error: 'Document must be between 1 byte and 10 MB' as const }
  const { data: ownedCase } = await admin.from('cases').select('id').eq('id', caseId).eq('owner_id', user.id).maybeSingle(); if (!ownedCase) return { error: 'Case not found' as const }
  const documentId = randomUUID(); const path = `${user.id}/${caseId}/${documentId}-${safeName(file.name)}`; const fileBytes = Buffer.from(await file.arrayBuffer()); const sha256 = createHash('sha256').update(fileBytes).digest('hex')
  const uploaded = await admin.storage.from(BUCKET).upload(path, fileBytes, { contentType: file.type, upsert: false }); if (uploaded.error) return { error: uploaded.error.message }
  const inserted = await admin.from('source_documents').insert({ id: documentId, owner_id: user.id, case_id: caseId, path, mime: file.type as 'application/pdf' | 'image/jpeg' | 'image/png', size_bytes: file.size, sha256, status: 'UPLOADED' }).select('*').single()
  if (inserted.error) { await admin.storage.from(BUCKET).remove([path]); return { error: inserted.error.message } }
  const auditError = await writeAuditEvent(admin, user.id, caseId, 'document_uploaded', { document_id: documentId, mime: file.type, size_bytes: file.size })
  if (auditError) { await admin.from('source_documents').delete().eq('id', documentId).eq('owner_id', user.id); await admin.storage.from(BUCKET).remove([path]); return { error: auditError } }
  return { document: inserted.data, manualReviewRequired: true }
}

export async function extractOwnedPdfDocument(documentId: string) {
  const { user } = await getAuthenticatedUser(); if (!user) return { error: 'Unauthorized' as const }
  const admin = createAdminClient(); if (!admin) return { error: 'Supabase is not configured' as const }
  const { data: document, error: lookupError } = await admin.from('source_documents').select('id, owner_id, case_id, path, mime, size_bytes').eq('id', documentId).eq('owner_id', user.id).maybeSingle()
  if (lookupError) return { error: lookupError.message }
  if (!document) return { error: 'Document not found' as const }
  if (document.mime !== 'application/pdf') return { error: 'Only PDF extraction is currently supported' as const }
  if (document.size_bytes > MAX_BYTES) return { error: 'Document exceeds the 10 MB extraction limit' as const }

  await admin.from('source_documents').update({ status: 'UPLOADED' }).eq('id', documentId).eq('owner_id', user.id)
  const downloaded = await admin.storage.from(BUCKET).download(document.path)
  if (downloaded.error) return { error: downloaded.error.message }
  try {
    const pdfBytes = new Uint8Array(await downloaded.data.arrayBuffer())
    const extractedPages = await extractPdfPages(pdfBytes)
    const scannedPageNumbers = extractedPages.filter((page) => page.needsOcr).map((page) => page.pageNo)
    const ocrPages = scannedPageNumbers.length ? await ocrScannedPdfPages(pdfBytes, scannedPageNumbers) : []
    const pages = extractedPages.map((page) => ocrPages.find((ocrPage) => ocrPage.pageNo === page.pageNo) ?? page)
    const inserted = await admin.from('document_pages').upsert(pages.map((page) => ({ owner_id: user.id, case_id: document.case_id, document_id: document.id, page_no: page.pageNo, text_content: page.text, confidence: page.confidence })), { onConflict: 'document_id,page_no' })
    if (inserted.error) throw new Error(inserted.error.message)
    const status = pages.some((page) => page.needsOcr || page.confidence < 0.75) ? 'NEEDS_CONFIRMATION' : 'READY'
    const updated = await admin.from('source_documents').update({ status }).eq('id', document.id).eq('owner_id', user.id)
    if (updated.error) throw new Error(updated.error.message)
    await writeAuditEvent(admin, user.id, document.case_id, 'document_extracted', { document_id: document.id, pages: pages.length, needs_ocr: pages.some((page) => page.needsOcr) })
    return { documentId: document.id, pages, needsOcr: pages.some((page) => page.needsOcr) }
  } catch (error) {
    await admin.from('source_documents').update({ status: 'FAILED' }).eq('id', document.id).eq('owner_id', user.id)
    return { error: error instanceof Error ? error.message : 'Document extraction failed' }
  }
}

export async function ocrOwnedImageDocument(documentId: string) {
  const { user } = await getAuthenticatedUser(); if (!user) return { error: 'Unauthorized' as const }
  const admin = createAdminClient(); if (!admin) return { error: 'Supabase is not configured' as const }
  const { data: document, error: lookupError } = await admin.from('source_documents').select('id, case_id, path, mime, size_bytes').eq('id', documentId).eq('owner_id', user.id).maybeSingle()
  if (lookupError) return { error: lookupError.message }
  if (!document) return { error: 'Document not found' as const }
  if (!['image/jpeg', 'image/png'].includes(document.mime)) return { error: 'OCR image fallback accepts JPEG or PNG' as const }
  if (document.size_bytes > MAX_BYTES) return { error: 'Document exceeds the 10 MB OCR limit' as const }
  const downloaded = await admin.storage.from(BUCKET).download(document.path)
  if (downloaded.error) return { error: downloaded.error.message }
  try {
    const result = await new TesseractOcrProvider().recognize(new Uint8Array(await downloaded.data.arrayBuffer()))
    const confidence = result.text ? result.confidence : 0
    const inserted = await admin.from('document_pages').upsert({ owner_id: user.id, case_id: document.case_id, document_id: document.id, page_no: 1, text_content: result.text, confidence }, { onConflict: 'document_id,page_no' })
    if (inserted.error) throw new Error(inserted.error.message)
    const status = confidence < 0.75 || !result.text ? 'NEEDS_CONFIRMATION' : 'READY'
    const updated = await admin.from('source_documents').update({ status }).eq('id', document.id).eq('owner_id', user.id)
    if (updated.error) throw new Error(updated.error.message)
    await writeAuditEvent(admin, user.id, document.case_id, 'document_ocr_completed', { document_id: document.id, confidence, needs_confirmation: status === 'NEEDS_CONFIRMATION' })
    return { documentId: document.id, pageNo: 1, text: result.text, confidence, needsConfirmation: status === 'NEEDS_CONFIRMATION' }
  } catch (error) {
    await admin.from('source_documents').update({ status: 'FAILED' }).eq('id', document.id).eq('owner_id', user.id)
    return { error: error instanceof Error ? error.message : 'OCR failed' }
  }
}

export async function signedOwnedDocumentUrl(documentId: string) {
  const { user } = await getAuthenticatedUser(); if (!user) return { error: 'Unauthorized' as const }
  const admin = createAdminClient(); if (!admin) return { error: 'Supabase is not configured' as const }
  const { data: document } = await admin.from('source_documents').select('id, path, case_id').eq('id', documentId).eq('owner_id', user.id).maybeSingle(); if (!document) return { error: 'Document not found' as const }
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(document.path, 300); if (error) return { error: error.message }
  return { url: data.signedUrl, expiresIn: 300 }
}

export async function listOwnedDocuments(caseId: string) {
  const { user } = await getAuthenticatedUser(); if (!user) return { error: 'Unauthorized' as const }
  const admin = createAdminClient(); if (!admin) return { error: 'Supabase is not configured' as const }
  const { data, error } = await admin.from('source_documents').select('id, case_id, path, mime, size_bytes, status, created_at').eq('case_id', caseId).eq('owner_id', user.id).order('created_at', { ascending: false })
  return error ? { error: error.message } : { documents: data ?? [] }
}

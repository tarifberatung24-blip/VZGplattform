import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/database'

const BUCKET = 'source-documents'
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const MAX_BYTES = 10 * 1024 * 1024

export interface SourceDocumentRepository {
  upload(input: { caseId: string; file: File }): Promise<{ path: string | null; error: string | null }>
}

export function createSourceDocumentRepository(client: SupabaseClient<Database>, userId: string): SourceDocumentRepository {
  return {
    async upload({ caseId, file }) {
      if (!ALLOWED_MIME.has(file.type)) return { path: null, error: 'Unsupported document type' }
      if (file.size < 1 || file.size > MAX_BYTES) return { path: null, error: 'Document must be between 1 byte and 10 MB' }
      const path = `${userId}/${caseId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
      if (error) return { path: null, error: error.message }
      return { path, error: null }
    },
  }
}

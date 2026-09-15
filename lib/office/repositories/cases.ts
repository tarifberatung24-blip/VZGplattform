import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, CaseIntent, CaseStatus, Locale } from '../supabase/database'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'
import { writeAuditEvent } from '../supabase/audit'

type CaseTable = Database['public']['Tables']['cases']
export type CaseRecord = CaseTable['Row']
export type NewCase = { title: string; intent: CaseIntent; ui_locale: Locale; conversation_locale: Locale; institution?: string | null; deadline?: string | null }
export type CaseUpdate = Partial<Pick<CaseRecord, 'title' | 'intent' | 'ui_locale' | 'conversation_locale' | 'institution' | 'deadline'>>
export interface CaseRepository { listMine(limit?: number): Promise<{ data: CaseRecord[] | null; error: string | null }>; create(input: NewCase): Promise<{ data: CaseRecord | null; error: string | null }>; getMine(id: string): Promise<{ data: CaseRecord | null; error: string | null }>; updateMine(id: string, input: CaseUpdate): Promise<{ data: CaseRecord | null; error: string | null }>; archiveMine(id: string): Promise<{ data: CaseRecord | null; error: string | null }> }
class PreviewCaseRepository implements CaseRepository { async listMine() { return { data: [], error: null } } async create() { return { data: null, error: 'Supabase is not configured' } } async getMine() { return { data: null, error: 'Supabase is not configured' } } async updateMine() { return { data: null, error: 'Supabase is not configured' } } async archiveMine() { return { data: null, error: 'Supabase is not configured' } } }
class SupabaseCaseRepository implements CaseRepository {
  constructor(private readonly client: SupabaseClient<Database>, private readonly userId: string) {}
  async listMine(limit = 20) { const { data, error } = await this.client.from('cases').select('*').eq('owner_id', this.userId).order('created_at', { ascending: false }).limit(limit); return { data, error: error?.message ?? null } }
  async create(input: NewCase) { const { data, error } = await this.client.from('cases').insert({ ...input, owner_id: this.userId, status: 'NEW' as CaseStatus }).select('*').single(); return { data, error: error?.message ?? null } }
  async getMine(id: string) { const { data, error } = await this.client.from('cases').select('*').eq('id', id).eq('owner_id', this.userId).maybeSingle(); return { data, error: error?.message ?? null } }
  async updateMine(id: string, input: CaseUpdate) { const { data, error } = await this.client.from('cases').update(input).eq('id', id).eq('owner_id', this.userId).select('*').maybeSingle(); return { data, error: error?.message ?? (data ? null : 'Case not found') } }
  async archiveMine(id: string) { const admin = createAdminClient(); if (!admin) return { data: null, error: 'Supabase is not configured' }; const before = await admin.from('cases').select('status').eq('id', id).eq('owner_id', this.userId).maybeSingle(); if (!before.data) return { data: null, error: before.error?.message ?? 'Case not found' }; const { data, error } = await admin.from('cases').update({ status: 'CLOSED' as CaseStatus }).eq('id', id).eq('owner_id', this.userId).select('*').maybeSingle(); if (error || !data) return { data, error: error?.message ?? 'Case not found' }; const auditError = await writeAuditEvent(admin, this.userId, id, 'case_archived'); if (auditError) { await admin.from('cases').update({ status: before.data.status }).eq('id', id).eq('owner_id', this.userId); return { data: null, error: auditError } } return { data, error: null } }
}
export async function createCaseRepository(): Promise<{ repository: CaseRepository; userId: string | null; configured: boolean }> { const client = await createClient(); if (!client) return { repository: new PreviewCaseRepository(), userId: null, configured: false }; const { data: { user } } = await client.auth.getUser(); if (!user) return { repository: new PreviewCaseRepository(), userId: null, configured: true }; return { repository: new SupabaseCaseRepository(client, user.id), userId: user.id, configured: true } }

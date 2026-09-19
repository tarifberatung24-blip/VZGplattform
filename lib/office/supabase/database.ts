export type Locale = 'bg' | 'de' | 'ru' | 'pl' | 'sr' | 'ro'
export type CaseIntent = 'explanation' | 'reply' | 'complaint' | 'application' | 'objection' | 'cancellation' | 'document_request' | 'reminder' | 'free_email'
export type CaseStatus = 'NEW' | 'UPLOADED' | 'EXTRACTING' | 'NEEDS_INFO' | 'DRAFTING' | 'NEEDS_CONFIRMATION' | 'APPROVED' | 'EXPORTED' | 'SENT' | 'WAITING_REPLY' | 'ACTION_REQUIRED' | 'CLOSED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL' | 'HUMAN_REVIEW'
type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] }
export type Database = { public: { Tables: {
  profiles: Row<{ id: string; locale: Locale; conversation_locale: Locale; output_locale: Locale; display_name: string; created_at: string }>
  cases: Row<{ id: string; owner_id: string; title: string; intent: CaseIntent; ui_locale: Locale; conversation_locale: Locale; status: CaseStatus; horizon_status: string | null; horizon_module: string | null; institution: string | null; deadline: string | null; created_at: string }>
  source_documents: Row<{ id: string; owner_id: string; case_id: string; path: string; mime: 'application/pdf' | 'image/jpeg' | 'image/png'; size_bytes: number; sha256: string; status: 'UPLOADED' | 'EXTRACTING' | 'READY' | 'NEEDS_CONFIRMATION' | 'FAILED'; created_at: string }>
  document_pages: Row<{ id: string; owner_id: string; case_id: string; document_id: string; page_no: number; text_content: string; confidence: number | null; created_at: string }>
  case_messages: Row<{ id: string; owner_id: string; case_id: string; role: 'user' | 'assistant'; locale: Locale; content: string; created_at: string }>
  extracted_facts: Row<{ id: string; owner_id: string; case_id: string; document_id: string | null; page_no: number | null; key: string; value: string; evidence: string | null; source_type: 'document' | 'user'; confidence: number | null; critical: boolean; confirmed_at: string | null; created_at: string }>
  correspondence_drafts: Row<{ id: string; owner_id: string; case_id: string; version: number; subject_de: string; body_de: string; recipient: string | null; attachments: unknown[]; translation: string | null; translation_locale: Locale | null; model: string; prompt_version: string; input_facts_hash: string; content_hash: string; review_status: 'pending' | 'pass' | 'revise' | 'block'; created_at: string }>
  approvals: Row<{ id: string; user_id: string; draft_id: string; approved_hash: string; approved_at: string }>
  tasks: Row<{ id: string; owner_id: string; case_id: string; type: 'reminder' | 'human_review'; due_at: string | null; status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'; idempotency_key: string; created_at: string }>
  audit_events: Row<{ id: string; actor_id: string; case_id: string | null; action: string; metadata: Record<string, unknown>; created_at: string }>
  usage_counters: Row<{ user_id: string; period: string; ai_cases: number; tokens: number }>
}; Views: Record<string, never>; Functions: { consume_ai_quota: { Args: { p_user_id: string; p_daily_limit?: number; p_monthly_limit?: number }; Returns: { allowed: boolean; daily_used: number; monthly_used: number; daily_limit: number; monthly_limit: number; retry_after: string | null }[] } }; Enums: Record<string, never>; CompositeTypes: Record<string, never> } }

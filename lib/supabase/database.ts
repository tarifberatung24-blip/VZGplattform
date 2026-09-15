export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }

export type Database = {
  public: {
    Tables: {
      tax_assessments: Table<
        { id: string; user_id: string; profession: string; expenses: Json; total_amount: number; created_at: string },
        { id?: string; user_id: string; profession: string; expenses?: Json; total_amount?: number; created_at?: string },
        { id?: string; user_id?: string; profession?: string; expenses?: Json; total_amount?: number; created_at?: string }
      >
      benefit_checks: Table<
        { id: string; user_id: string; answers: Json; eligible_benefits: Json; rules_version: string; created_at: string },
        { id?: string; user_id: string; answers?: Json; eligible_benefits?: Json; rules_version?: string; created_at?: string },
        { id?: string; user_id?: string; answers?: Json; eligible_benefits?: Json; rules_version?: string; created_at?: string }
      >
      user_documents: Table<
        { id: string; user_id: string; file_name: string; storage_path: string | null; status: string; created_at: string },
        { id?: string; user_id: string; file_name: string; storage_path?: string | null; status?: string; created_at?: string },
        { id?: string; user_id?: string; file_name?: string; storage_path?: string | null; status?: string; created_at?: string }
      >
      user_profiles: Table<
        { user_id: string; display_name: string | null; locale: string; household: Json; created_at: string; updated_at: string },
        { user_id: string; display_name?: string | null; locale?: string; household?: Json; created_at?: string; updated_at?: string },
        { user_id?: string; display_name?: string | null; locale?: string; household?: Json; updated_at?: string }
      >
      document_analyses: Table<
        { id: string; document_id: string; user_id: string; status: string; model: string | null; analysis_version: string; document_type: string; issuing_authority: string | null; bescheid_date: string | null; known_access_date: string | null; remedy_deadline: string | null; payment_deadline: string | null; summary_bg: string; required_action_bg: string; missing_information: Json; citations: Json; human_review_required: boolean; raw_extraction: Json; created_at: string },
        { id?: string; document_id: string; user_id: string; status?: string; model?: string | null; analysis_version?: string; document_type?: string; issuing_authority?: string | null; bescheid_date?: string | null; known_access_date?: string | null; remedy_deadline?: string | null; payment_deadline?: string | null; summary_bg?: string; required_action_bg?: string; missing_information?: Json; citations?: Json; human_review_required?: boolean; raw_extraction?: Json; created_at?: string },
        { id?: string; document_id?: string; user_id?: string; status?: string; model?: string | null; analysis_version?: string; document_type?: string; issuing_authority?: string | null; bescheid_date?: string | null; known_access_date?: string | null; remedy_deadline?: string | null; payment_deadline?: string | null; summary_bg?: string; required_action_bg?: string; missing_information?: Json; citations?: Json; human_review_required?: boolean; raw_extraction?: Json; created_at?: string }
      >
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

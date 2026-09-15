export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }

type TaxFields = {
  id: string; user_id: string; profession: string; expenses: Json; total_amount: number; created_at: string
  tax_year: number | null; residence_country: string | null; tax_liability: string | null; steuerklasse: number | null
  commute_distance_km: number; office_days: number; home_office_days: number; documented_expenses: number
  calculated_result: Json; screening_status: string
}

type TaxInsert = Partial<Omit<TaxFields, "id" | "created_at" | "user_id">> & { user_id: string; profession: string }
type TaxUpdate = Partial<Omit<TaxFields, "id" | "created_at" | "user_id">> & { user_id?: string }

export type Database = {
  public: {
    Tables: {
      tax_assessments: Table<TaxFields, TaxInsert, TaxUpdate>
      benefit_checks: Table<
        { id: string; user_id: string; answers: Json; eligible_benefits: Json; eligible_benefit_keys: string[]; reasoning: string; rules_version: string; created_at: string },
        { id?: string; user_id: string; answers?: Json; eligible_benefits?: Json; eligible_benefit_keys?: string[]; reasoning?: string; rules_version?: string; created_at?: string },
        { id?: string; user_id?: string; answers?: Json; eligible_benefits?: Json; eligible_benefit_keys?: string[]; reasoning?: string; rules_version?: string; created_at?: string }
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

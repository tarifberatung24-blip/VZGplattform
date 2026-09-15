export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      tax_assessments: {
        Row: { id: string; user_id: string; profession: string; expenses: Json; total_amount: number; created_at: string }
        Insert: { id?: string; user_id: string; profession: string; expenses?: Json; total_amount?: number; created_at?: string }
        Update: { id?: string; user_id?: string; profession?: string; expenses?: Json; total_amount?: number; created_at?: string }
        Relationships: []
      }
      benefit_checks: {
        Row: { id: string; user_id: string; answers: Json; eligible_benefits: Json; rules_version: string; created_at: string }
        Insert: { id?: string; user_id: string; answers?: Json; eligible_benefits?: Json; rules_version?: string; created_at?: string }
        Update: { id?: string; user_id?: string; answers?: Json; eligible_benefits?: Json; rules_version?: string; created_at?: string }
        Relationships: []
      }
      user_documents: {
        Row: { id: string; user_id: string; file_name: string; storage_path: string | null; status: string; created_at: string }
        Insert: { id?: string; user_id: string; file_name: string; storage_path?: string | null; status?: string; created_at?: string }
        Update: { id?: string; user_id?: string; file_name?: string; storage_path?: string | null; status?: string; created_at?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

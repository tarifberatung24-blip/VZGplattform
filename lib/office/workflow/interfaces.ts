import type { CaseRecord } from '../repositories/cases'
import type { CaseIntent, Locale } from '../supabase/database'

export type ConfirmedFact = { key: string; value: string; evidence?: string | null; page_no?: number | null }
export type DraftInput = { caseRecord: CaseRecord; facts: ConfirmedFact[]; outputLocale: Locale; documentIds: string[] }
export type DraftOutput = { subject_de: string; body_de: string; recipient: string; translation: string; translation_locale: Locale; attachments: string[]; missing: string[]; inputFactsHash: string; contentHash: string }
export interface FactExtractor { extract(input: { documentId: string; mime: string; signedUrl: string }): Promise<{ facts: ConfirmedFact[]; manualReviewRequired: boolean }> }
export interface DraftGenerator { generate(input: DraftInput): Promise<DraftOutput> }
export interface Translator { translate(input: { subject: string; body: string; locale: Locale }): Promise<{ subject: string; body: string }> }
export interface SafetyReviewer { review(input: { draft: DraftOutput; facts: ConfirmedFact[] }): Promise<{ status: 'pass' | 'revise' | 'block'; missing: string[] }> }
export const intentLabel: Record<CaseIntent, string> = { explanation:'Erläuterung', reply:'Antwort', complaint:'Beschwerde', application:'Antrag', objection:'Widerspruch', cancellation:'Kündigung', document_request:'Unterlagenanforderung', reminder:'Erinnerung', free_email:'Anfrage' }

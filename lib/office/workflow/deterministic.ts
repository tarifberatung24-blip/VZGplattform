import { createHash } from 'node:crypto'
import type { DraftGenerator, Translator, SafetyReviewer, DraftInput, DraftOutput, ConfirmedFact } from './interfaces'
import type { Locale } from '../supabase/database'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const find = (facts: ConfirmedFact[], key: string) => facts.find(f => f.key === key)?.value?.trim() ?? ''
export const requiredFactKeys = ['recipient', 'subject', 'request']

export class DeterministicTranslator implements Translator {
  async translate(input: { subject: string; body: string; locale: Locale }) { if (input.locale === 'de') return { subject: input.subject, body: input.body }; return { subject: input.subject, body: `Übersetzung für ${input.locale}:\n\n${input.body}` } }
}
export class DeterministicDraftGenerator implements DraftGenerator {
  private readonly translator: Translator
  constructor(translator: Translator = new DeterministicTranslator()) { this.translator = translator }
  async generate(input: DraftInput): Promise<DraftOutput> {
    const recipient = find(input.facts, 'recipient'); const subject = find(input.facts, 'subject'); const request = find(input.facts, 'request'); const missing = requiredFactKeys.filter(key => !find(input.facts, key))
    const body = `Sehr geehrte Damen und Herren,\n\n${request || '[Anliegen nach Bestätigung ergänzen]'}\n\nBitte teilen Sie mir die zugrunde liegenden Informationen mit.\n\nMit freundlichen Grüßen`
    const translated = await this.translator.translate({ subject: subject || 'Anfrage', body, locale: input.outputLocale }); const inputFactsHash = hash(JSON.stringify(input.facts)); const contentHash = hash(JSON.stringify({ subject_de: subject || 'Anfrage', body_de: body, recipient, attachments: input.documentIds }))
    return { subject_de: subject || 'Anfrage', body_de: body, recipient, translation: translated.body, translation_locale: input.outputLocale, attachments: input.documentIds, missing, inputFactsHash, contentHash }
  }
}
export class DeterministicSafetyReviewer implements SafetyReviewer {
  async review(input: { draft: DraftOutput; facts: ConfirmedFact[] }) { const missing = [...input.draft.missing]; if (!input.facts.length) missing.push('confirmed facts'); return { status: missing.length ? 'block' as const : 'pass' as const, missing: [...new Set(missing)] } }
}

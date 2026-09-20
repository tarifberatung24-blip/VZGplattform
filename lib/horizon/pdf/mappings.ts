/**
 * P9 — fact→field mappings for official templates.
 *
 * **This registry is intentionally empty, and that is the correct state.**
 *
 * A mapping assigns a confirmed fact to a named AcroForm field. Every field name
 * it may use must be read from the template it targets. The official templates
 * currently in `public/forms/` are static printable forms that expose no fields
 * (see `registry.ts` and `source.ts`), so there is no field name that can be
 * verified against them. Writing mappings now would mean inventing field names,
 * which is precisely the failure this engine exists to prevent: `planPdfFill`
 * would reject them as `unknown_field` anyway, but recording them here would
 * still be a false claim about verified official structure.
 *
 * Mappings are therefore added only when all of the following hold:
 *
 * 1. An official fillable template is present and its SHA-256 is recorded.
 * 2. Its AcroForm field names have been read from the file itself, not from
 *    documentation or a previous tax year.
 * 3. Each mapped fact key exists on the case spine and the value shape suits the
 *    field kind (text, checkbox literal, radio export value).
 * 4. The mapping is scoped to that template id, so it can never be applied to a
 *    different form or a different tax year.
 *
 * Tax-year rule: a mapping for a 2025 template must not be reused for a 2026
 * template even if the form names look identical. The P15 source inventory
 * records that 2025 Form-IDs, rows and rules must be re-verified for 2026 from an
 * official source, and a field name is exactly such an identifier.
 */

import type { PdfFieldMapping } from "./fill"

/** Template id → the mappings verified for that template. */
export const TEMPLATE_MAPPINGS: Readonly<Record<string, readonly PdfFieldMapping[]>> = {}

/**
 * Mappings for a template. An unknown template returns none, so a mapping can
 * never leak from one form to another.
 */
export function mappingsForTemplate(templateId: string): readonly PdfFieldMapping[] {
  return TEMPLATE_MAPPINGS[templateId] ?? []
}

export function hasMappings(templateId: string): boolean {
  return (TEMPLATE_MAPPINGS[templateId]?.length ?? 0) > 0
}

export function mappedTemplateIds(): readonly string[] {
  return Object.keys(TEMPLATE_MAPPINGS)
}
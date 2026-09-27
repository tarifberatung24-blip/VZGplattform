# PDF export scope

The old `/api/steuer/pdf` surface is an authenticated **readiness/compatibility endpoint**, not the PDF generator.

- Readiness is derived from the verified HORIZON 2025 template/mapping registry.
- It no longer ends in a permanent `501 PDF_GENERATION_NOT_CONFIGURED` placeholder.
- Actual official-form generation is case-bound through `/api/horizon/cases/{caseId}/tax-form` and the P9/P15 workflow.
- No ELSTER submission is implied or performed.

This separation prevents the legacy tax-pipeline review surface from becoming a second PDF engine.

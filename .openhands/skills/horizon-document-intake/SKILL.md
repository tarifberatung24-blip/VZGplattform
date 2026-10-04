---
name: horizon-document-intake
description: Build or review the document intake flow from upload through preview, metadata, and user confirmation.
---

Use when a task involves documents, OCR, previews, extraction, or intake states.

Keep the flow explicit: select -> validate -> upload -> persist metadata -> preview -> user review -> confirm.
Expose loading, empty, error, retry, and unsupported-file states. Preserve source provenance and confidence for extracted fields.
Never invent OCR output, tax values, eligibility, government mappings, or missing document facts. Extraction is a proposal until the user confirms it.
Use the canonical `cases` family for new case-linked work; use legacy `platform_*` only through thin compatibility adapters.

For scanned PDFs, first determine whether a text layer exists. If it is empty or unusable,
route page images through the existing vision/OCR handoff instead of pretending that text was
extracted. Preserve page numbers, source image identity, extraction method, and confidence.
For screenshots, handwriting, and photographed letters, use the vision-capable path and mark
uncertain text as uncertain rather than guessing.

Reconcile important values against the source document and, where possible, a second extracted
signal. Check arithmetic, dates, identifiers, totals, and units before presenting conclusions.
Separate observed facts, interpretation, possible options, and recommended next steps. Legal
or financial conclusions require an authoritative source check; do not present a possibility as
a guaranteed legal result. Keep a clear evidence trail back to the page or image that supports
each material finding.

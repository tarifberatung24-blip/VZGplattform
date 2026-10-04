---
name: horizon-pdf-operations
description: Use HORIZON's local PDF operations for inspection, page extraction, splitting, merging, and OCR preparation.
---

Prefer the existing `lib/horizon/pdf/operations.ts` and the existing OCR pipeline before
introducing a new PDF service. Page numbers exposed to users are 1-based. Preserve the source
document hash, page mapping, case ownership, and audit provenance for every derived artifact.

Supported safe operations are inspection, extraction of selected pages, splitting into pages,
and merging documents. These operations must validate input bytes and page ranges, preserve the
original bytes, and return new artifacts. OCR remains a separate step through the existing
document intake/vision pipeline.

Do not claim that a visual redaction is secure. True redaction requires removing underlying PDF
content and a dedicated verification test; drawing a black rectangle is not sufficient.
Require owner-scoped access before exposing any operation through an API route.

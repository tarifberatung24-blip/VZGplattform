---
name: horizon-upload-guard
description: Diagnose and harden document upload validation without weakening project or tenant boundaries.
---

Use for upload, storage, project-identity, file-type, size, or document-ingestion changes.

- Read `PROJECT_RULES.md`, `supabase/project.json`, `lib/documents/validation.ts`, the upload route, and related tests.
- Treat the canonical Supabase project as configuration, not as a value to infer from environment or legacy references.
- Validate project identity, authentication, file size/type, and ownership before storage writes.
- Use synthetic fixtures only. Never print customer files, tokens, or authenticated URLs.
- Add regression tests for canonical URL, trailing slash, wrong project, missing project, unauthenticated user, and invalid file.
- Keep remote upload smoke tests separate from local unit tests and label missing cloud access as BLOCKED.

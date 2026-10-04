---
name: horizon-case-workflow
description: Implement or audit owner-scoped HORIZON case workflows with clear status and approval boundaries.
---

Use for cases, tasks, correspondence, deadlines, or owner-scoped workflow changes.

- Use `public.cases` as the canonical model and enforce owner scoping with authenticated identity.
- Define state transitions and reject invalid transitions deterministically.
- Keep analyze, explain, review, approve, execute, and monitor as distinct stages.
- Show who can act, what is pending, and what evidence supports the next action.
- Add authorization tests for owner, other user, unauthenticated, and missing-record paths.
- Do not delete or destructively migrate the preserved `platform_*` compatibility surface.

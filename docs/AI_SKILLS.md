# HORIZON AI skills

Project-local reusable skills live under `.openhands/skills/`. There are 32 skills: 10 foundation skills and 22 orchestration, connector, safety, and operations skills. They are intentionally narrow: each skill routes an agent to the relevant repository rules and verification criteria; they do not authorize deployment, merge, schema changes, or access to customer data.

| Skill | Use for |
|---|---|
| `horizon-phase-context` | phase-scoped context and governance |
| `horizon-upload-guard` | upload validation and project identity |
| `horizon-document-intake` | document intake, preview, OCR proposals |
| `horizon-case-workflow` | owner-scoped cases and state transitions |
| `horizon-contract-workflow` | contracts, renewals, deadlines, recurring costs |
| `horizon-provenance` | evidence, sources, calculations, confidence |
| `horizon-i18n-quality` | German/Bulgarian/English localization |
| `horizon-security-review` | auth, RLS assumptions, secrets, approvals |
| `horizon-ui-qa` | browser, responsive, accessibility, visual smoke tests |
| `horizon-release-gate` | quality gate and handoff report |

These skills accelerate implementation and review. They do not make an unverified product phase DONE.

See [AI_ORCHESTRATION.md](AI_ORCHESTRATION.md) for the multi-model, connector, plugin, permission, and parallel-work contract.

---
description: Security review of the current diff (HORIZON-specific checklist)
---
Review `git diff origin/main...HEAD` (or $ARGUMENTS) for real, exploitable issues only. For each finding give file:line, the concrete failure scenario and the smallest fix. Check:

- **AuthZ:** every route/server action re-checks the signed-in user; no trust in client-sent user ids; owner scoping on `cases`, `documents`, `contracts`, households.
- **Supabase:** service-role client only on the server and only where RLS cannot apply; no service key in client bundles.
- **Redirects:** no open redirect (`/go`, `next=` params use `sanitizeNextPath` or allow-lists); public origin from forwarded headers, never `request.url` behind Render.
- **Input:** zod validation on every API body; file upload type/size limits; no SQL built from strings.
- **Secrets & PII:** nothing printed to logs; no PII in URLs; DSGVO purpose and retention for new personal data.
- **AI output:** never presented as verified fact; amounts and deadlines labelled "from the document" or "check".
- **Partner links:** disclosed as partner offers; no guessed tracking parameters.
Report "no findings" plainly when there are none.

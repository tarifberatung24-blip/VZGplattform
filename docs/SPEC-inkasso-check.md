# SPEC — Inkasso-Check

Status: **implemented (phase 1–3 of the rule pack)**. Draft for review.

## What it does

A user pastes or uploads an Inkasso letter, a Mahnbescheid, or a utility
dispute. The product extracts the parties, amounts and dates, the user confirms
them, a deterministic rule pack assesses each position against German law, and
the product prepares the letters the assessment calls for.

It produces structured initial information. It does not give legal advice, it
does not send anything, and every draft waits for the user's explicit approval.

## Why it exists

Verbraucherzentrale already offers a free questionnaire-based Inkasso-Check. The
differentiation here is document-based extraction rather than a questionnaire,
Bulgarian alongside German for Bulgarians in Germany, specialisation in
energy/utility disputes, and integration with the rest of HORIZON.

## Where it lives

| Piece | Path |
|---|---|
| Rule pack (R1–R11) | `lib/inkasso/rule-pack.ts` |
| Fact sanitising | `lib/inkasso/facts.ts` |
| Case access | `lib/inkasso/case-access.ts` |
| Letter templates | `lib/inkasso/drafts.ts` |
| Wizard UI | `components/inkasso/inkasso-wizard.tsx` |
| Page | `app/[locale]/pruefung/page.tsx` |
| Table | `supabase/migrations/20261002000000_inkasso_cases.sql` |

## API

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/inkasso/cases` | Create a case |
| GET | `/api/inkasso/cases` | List the user's cases |
| GET | `/api/inkasso/cases/{id}` | Read one case |
| DELETE | `/api/inkasso/cases/{id}` | DSGVO erasure |
| POST | `/api/inkasso/cases/{id}/extract` | Text to fact groups with confidence |
| PUT | `/api/inkasso/cases/{id}/facts` | Save the confirmed facts |
| POST | `/api/inkasso/cases/{id}/evaluate` | Run the rule pack |
| POST | `/api/inkasso/cases/{id}/drafts` | Generate the letters |
| PUT | `/api/inkasso/cases/{id}/drafts` | Save an edited draft |
| POST | `/api/inkasso/cases/{id}/review` | Approve a draft |

## Rules

R1 deadline (§ 694 ZPO) · R2 decomposition · R3 interest (§ 288 BGB) ·
R4 inkasso fee (§ 13e RDG, BGH VII ZR 81/21) · R5 reminder costs (§ 286, § 280 BGB) ·
R6 limitation (§§ 195, 199 BGB) · R7 double billing (§ 404, § 812 BGB) ·
R8 data-exchange failure (§ 20a EnWG) · R9 assignment proof (§ 410 BGB) ·
R10 Schufa bar (§ 31 BDSG) · R11 no fault, no default (§ 286 Abs. 4 BGB).

Assessments: `unfounded` · `disputable` · `reducible` · `due`.
Pack version `1.0.0`, `basiszinssatz_pct = 1.52`.

## Reference case

Vertragskonto 8802312928, Amtsgericht Hünfeld, Bad Homburger Inkasso GmbH,
2,427.05 €. With a parallel supplier and an admitted data-exchange failure the
engine returns risk **high**, **511.40 €** disputable, and the actions
WIDERSPRUCH + ABTRETUNGSNACHWEIS + VERGLEICH. Covered by
`lib/inkasso/pipeline.test.ts`.

## Wiring

The feature needs two things before it works in production.

**1. The migration must be applied to the Supabase project** (`mteguzgbiuexmdcrqajj`,
eu-central-1). The case routes return `SCHEMA_MISSING` until the table exists.
Either paste `supabase/migrations/20261002000000_inkasso_cases.sql` into the SQL
editor, or run `supabase link --project-ref mteguzgbiuexmdcrqajj` followed by
`supabase db push`. Applying it twice is safe; the migration is idempotent.

**2. Render deploys the feature from `main`.** The service already carries the
Supabase variables that the rest of the app uses. No new environment variable is
required: the Inkasso routes share `lib/supabase/server.ts` and therefore the
same `NEXT_PUBLIC_SUPABASE_URL` and anon/publishable key as Kindergeld.

Verified against real Postgres 16 (RLS, the `updated_at` trigger, the locale and
case_type checks, the document FK and the cascade that backs DSGVO erasure) by
`supabase/tests/rls/inkasso_cases_isolation.sql`.

## Still open

- Azure AI Document Intelligence for scanned letters (EU region). Today the
  extraction is a deterministic text parser; a scan needs OCR first, which the
  documents pipeline can supply as `text`.
- ZUGFeRD/XRechnung structured parsing.
- The rule pack needs a lawyer's review before it is presented as production
  legal content.
- `basiszinssatz_pct` is a constant and must be re-checked when § 247 BGB moves.
- Filing guidance covers the paper Vordruck and online-mahnantrag.de; it must
  never claim electronic filing on the user's behalf.

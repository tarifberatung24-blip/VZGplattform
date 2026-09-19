/**
 * Capital P0 readiness report — machine-readable.
 *
 * Reports the integration status of every P0 area and, where persistence is
 * missing, documents the exact schema and RLS requirements for a later
 * owner-authorized phase. This module creates nothing: no migration, no table,
 * no policy, no SQL execution.
 */

export const CAPITAL_P0_STATUSES = [
  "IMPLEMENTED",
  "PARTIAL",
  "BLOCKED_BY_SCHEMA",
  "BLOCKED_BY_RLS",
  "BLOCKED_BY_DATA",
  "NOT_IN_SCOPE",
] as const

export type CapitalP0Status = (typeof CAPITAL_P0_STATUSES)[number]

export type CapitalP0Area = {
  area: string
  status: CapitalP0Status
  /** What exists today at application level. */
  implemented: string
  /** What is still missing before the area is complete. */
  remaining: string
}

export const CAPITAL_P0_AREAS: readonly CapitalP0Area[] = [
  {
    area: "existing_source_inspection",
    status: "IMPLEMENTED",
    implemented:
      "Reused existing tables and patterns: extracted_facts, documents, contracts, cases, households, financial_profiles, document_reviews, plus ownership and RLS conventions.",
    remaining: "None for read-only inspection.",
  },
  {
    area: "source_to_financial_fact_adapters",
    status: "IMPLEMENTED",
    implemented:
      "Deterministic adapters for extracted_facts, contracts, and document_reviews; AI/OCR values stay DRAFT, human-confirmed values become CONFIRMED, unsupported keys are reported.",
    remaining: "No additional source types are required for P0.",
  },
  {
    area: "capital_analysis_input_builder",
    status: "IMPLEMENTED",
    implemented:
      "Household isolation enforced twice; validated confirmed facts only; missing, unconfirmed, rejected, and superseded inputs surfaced explicitly.",
    remaining: "Persisting the built input is out of scope for P0.",
  },
  {
    area: "capital_runtime_orchestrator",
    status: "IMPLEMENTED",
    implemented:
      "Single composition service: source bundle to adapters to analysis input to runCapitalEngine to scenario to review draft. No LLM arithmetic, no provider calls.",
    remaining: "Wiring to a request handler or job runner is a later phase.",
  },
  {
    area: "advisor_review_lifecycle",
    status: "PARTIAL",
    implemented:
      "Deterministic draft to in_review to approved to published to superseded transitions with immutability, reviewer/timestamp requirements, and rejection of invalid transitions.",
    remaining:
      "Review records are in-memory contracts only; persistence and the advisor/customer authorization boundary are not implemented.",
  },
  {
    area: "publish_boundary_preparation",
    status: "PARTIAL",
    implemented:
      "Server-side preparation validates household, scenario, approved review, authorization, schema/disclaimer versions, canonical payload hash, idempotency key, and replay conflicts.",
    remaining:
      "No publish job is stored and no external publication occurs; persistence of jobs and audit events needs schema approval.",
  },
  {
    area: "p0_intake_model",
    status: "IMPLEMENTED",
    implemented:
      "Independently authored neutral intake categories with required-key and gap reporting; no DIN text, tables, formulas, thresholds, questionnaires, or scoring.",
    remaining: "Intake UI is out of scope.",
  },
  {
    area: "fact_persistence",
    status: "BLOCKED_BY_SCHEMA",
    implemented:
      "FinancialFact is a validated in-memory domain model with versioning and confirmation lifecycle.",
    remaining:
      "No capital fact table exists. Persistence requires an owner-authorized migration (see schema requirements below).",
  },
  {
    area: "review_and_publish_persistence",
    status: "BLOCKED_BY_SCHEMA",
    implemented: "AdvisorReview and the preparePublish boundary are enforced in application code.",
    remaining:
      "Review versions, publish jobs, and audit events are not persisted. Requires an owner-authorized migration.",
  },
  {
    area: "household_rls_for_capital_tables",
    status: "BLOCKED_BY_RLS",
    implemented: "Household isolation is enforced in application code and mirrors existing ownership checks.",
    remaining:
      "Database-level RLS for the future capital tables cannot be granted until the tables exist and the canonical Supabase project is confirmed.",
  },
  {
    area: "live_household_source_data",
    status: "BLOCKED_BY_DATA",
    implemented: "Adapters operate on the documented row shapes and run against fixtures in tests.",
    remaining:
      "Reading real household rows requires configured Supabase credentials and runtime access, which this task did not use.",
  },
  {
    area: "capital_ui",
    status: "NOT_IN_SCOPE",
    implemented: "Nothing.",
    remaining: "Customer and advisor surfaces are explicitly out of scope for P0 runtime integration.",
  },
  {
    area: "external_providers_and_investment_features",
    status: "NOT_IN_SCOPE",
    implemented: "Nothing.",
    remaining:
      "Personalized advice, trading, bank/broker connections, Schufa integration, and provider execution remain prohibited.",
  },
]

/**
 * Exact persistence requirements for the next owner-authorized phase.
 * Documented only — deliberately not created by this task.
 */
export type CapitalSchemaRequirement = {
  table: string
  purpose: string
  columns: readonly string[]
  indexes: readonly string[]
  rls: readonly string[]
}

export const CAPITAL_SCHEMA_REQUIREMENTS: readonly CapitalSchemaRequirement[] = [
  {
    table: "capital_facts",
    purpose: "Persist household-scoped FinancialFacts with versioning and confirmation state.",
    columns: [
      "id uuid primary key default gen_random_uuid()",
      "household_id uuid not null references public.households(id) on delete cascade",
      "key text not null",
      "value_type text not null check (value_type in ('money','number','boolean','date','text','enum'))",
      "value_minor_units bigint",
      "value_number numeric",
      "value_text text",
      "value_boolean boolean",
      "value_date date",
      "currency text",
      "unit text",
      "source text not null check (source in ('USER','DOCUMENT','PROVIDER','SYSTEM','AI_EXTRACTED'))",
      "source_reference text",
      "evidence_reference text",
      "extraction_run_id text",
      "source_version text",
      "confidence numeric(5,4)",
      "observed_at timestamptz",
      "retrieved_at timestamptz",
      "confirmed_at timestamptz",
      "confirmed_by uuid references auth.users(id)",
      "version integer not null default 1",
      "status text not null default 'DRAFT' check (status in ('DRAFT','CONFIRMED','REJECTED','SUPERSEDED'))",
      "superseded_by uuid references public.capital_facts(id)",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()",
    ],
    indexes: [
      "unique (household_id, key, version)",
      "index on (household_id, status)",
      "index on (household_id, key, version desc)",
      "unique (id, household_id) to support composite foreign keys",
    ],
    rls: [
      "enable row level security on public.capital_facts",
      "policy capital_facts_owner for all to authenticated using (household_id in (select id from public.households where owner_id = (select auth.uid()))) with check (same predicate)",
      "no policy for anon; service_role bypass remains server-only",
      "confirmed_by must equal (select auth.uid()) when status changes to CONFIRMED",
    ],
  },
  {
    table: "capital_scenarios",
    purpose: "Persist deterministic engine outputs with their engine version and input hash.",
    columns: [
      "id uuid primary key default gen_random_uuid()",
      "household_id uuid not null references public.households(id) on delete cascade",
      "engine_version text not null",
      "input_snapshot_hash text not null",
      "currency text not null",
      "locale text not null",
      "feasibility text not null check (feasibility in ('needs_data','not_feasible','feasible','review_required'))",
      "horizon_months integer",
      "assumptions jsonb not null default '[]'::jsonb",
      "missing_inputs jsonb not null default '[]'::jsonb",
      "outputs jsonb not null default '{}'::jsonb",
      "disclaimer_version text not null",
      "calculated_at timestamptz not null",
      "created_at timestamptz not null default now()",
    ],
    indexes: [
      "unique (household_id, input_snapshot_hash, engine_version)",
      "index on (household_id, calculated_at desc)",
    ],
    rls: [
      "enable row level security on public.capital_scenarios",
      "owner-only policy matching public.capital_facts",
    ],
  },
  {
    table: "capital_reviews",
    purpose: "Persist immutable advisor review versions and their transition history.",
    columns: [
      "id uuid primary key default gen_random_uuid()",
      "household_id uuid not null references public.households(id) on delete cascade",
      "scenario_id uuid not null references public.capital_scenarios(id) on delete cascade",
      "reviewed_version integer not null default 1",
      "state text not null check (state in ('draft','in_review','approved','published','superseded'))",
      "reviewer_id uuid references auth.users(id)",
      "reviewed_at timestamptz",
      "notes text",
      "created_at timestamptz not null default now()",
      "constraint capital_reviews_approval_metadata check (state not in ('approved','published') or (reviewer_id is not null and reviewed_at is not null))",
    ],
    indexes: [
      "index on (household_id, scenario_id, reviewed_version desc)",
      "index on (household_id, state)",
    ],
    rls: [
      "enable row level security on public.capital_reviews",
      "advisor and owning-customer read policy; write restricted to the advisor boundary",
      "no update that mutates a published row: only a new reviewed_version may be inserted",
    ],
  },
  {
    table: "capital_publish_jobs",
    purpose: "Persist prepared publish jobs with idempotency and payload hash.",
    columns: [
      "id uuid primary key default gen_random_uuid()",
      "household_id uuid not null references public.households(id) on delete cascade",
      "scenario_id uuid not null references public.capital_scenarios(id) on delete cascade",
      "review_id uuid not null references public.capital_reviews(id) on delete restrict",
      "schema_version text not null",
      "disclaimer_version text not null",
      "payload_hash text not null",
      "idempotency_key text not null",
      "authorized_by uuid not null references auth.users(id)",
      "status text not null default 'prepared' check (status in ('prepared','published','failed','superseded'))",
      "created_at timestamptz not null default now()",
      "constraint capital_publish_jobs_idempotency unique (idempotency_key)",
    ],
    indexes: [
      "unique (idempotency_key)",
      "index on (household_id, created_at desc)",
      "index on (scenario_id)",
    ],
    rls: [
      "enable row level security on public.capital_publish_jobs",
      "insert only by the server-side advisor boundary; customers read their own household rows",
      "replay with the same idempotency_key and payload_hash returns the existing row; a different household or hash is rejected",
    ],
  },
  {
    table: "capital_audit_events",
    purpose: "Append-only audit trail for fact confirmation, review transitions, and publish preparation.",
    columns: [
      "id uuid primary key default gen_random_uuid()",
      "household_id uuid not null references public.households(id) on delete cascade",
      "actor_id uuid references auth.users(id)",
      "entity_type text not null check (entity_type in ('fact','scenario','review','publish_job'))",
      "entity_id uuid not null",
      "action text not null",
      "metadata jsonb not null default '{}'::jsonb",
      "created_at timestamptz not null default now()",
    ],
    indexes: [
      "index on (household_id, created_at desc)",
      "index on (entity_type, entity_id, created_at desc)",
    ],
    rls: [
      "enable row level security on public.capital_audit_events",
      "insert allowed for authenticated household members; no update or delete policy (append-only)",
    ],
  },
]

export type CapitalP0ReadinessReport = {
  generatedFor: string
  statuses: readonly CapitalP0Area[]
  counts: Record<CapitalP0Status, number>
  schemaRequiredNext: readonly CapitalSchemaRequirement[]
  /** Areas with no application-level gap, ready for the next phase. */
  readyAreas: readonly string[]
  partialAreas: readonly string[]
  blockedAreas: readonly string[]
}

/**
 * Builds the P0 readiness report. Deterministic: the same `generatedFor` value
 * always yields the same report.
 */
export function buildCapitalP0ReadinessReport(generatedFor: string): CapitalP0ReadinessReport {
  const counts = CAPITAL_P0_STATUSES.reduce<Record<CapitalP0Status, number>>(
    (accumulator, status) => ({ ...accumulator, [status]: 0 }),
    {} as Record<CapitalP0Status, number>,
  )
  for (const area of CAPITAL_P0_AREAS) counts[area.status] += 1

  const byStatus = (status: CapitalP0Status) =>
    CAPITAL_P0_AREAS.filter((area) => area.status === status).map((area) => area.area)

  return {
    generatedFor,
    statuses: CAPITAL_P0_AREAS,
    counts,
    schemaRequiredNext: CAPITAL_SCHEMA_REQUIREMENTS,
    readyAreas: byStatus("IMPLEMENTED"),
    partialAreas: byStatus("PARTIAL"),
    blockedAreas: [
      ...byStatus("BLOCKED_BY_SCHEMA"),
      ...byStatus("BLOCKED_BY_RLS"),
      ...byStatus("BLOCKED_BY_DATA"),
    ],
  }
}

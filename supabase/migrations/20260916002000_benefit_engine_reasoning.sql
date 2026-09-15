-- Eligibility Engine extension.
-- Apply in Supabase SQL Editor after the existing benefit_checks migration.
-- eligible_benefit_keys is the normalized array of benefit identifiers; eligible_benefits remains the legacy JSONB card snapshot for compatibility.

alter table public.benefit_checks
  add column if not exists eligible_benefit_keys text[] not null default '{}',
  add column if not exists reasoning text not null default '';

alter table public.benefit_checks
  drop constraint if exists benefit_checks_reasoning_length_check,
  add constraint benefit_checks_reasoning_length_check check (char_length(reasoning) <= 10000),
  drop constraint if exists benefit_checks_benefit_keys_check,
  add constraint benefit_checks_benefit_keys_check check (cardinality(eligible_benefit_keys) <= 20);

create index if not exists benefit_checks_user_keys_idx
  on public.benefit_checks using gin (eligible_benefit_keys);

comment on column public.benefit_checks.eligible_benefit_keys is
  'Normalized string identifiers such as kindergeld, kinderzuschlag, wohngeld and buergergeld.';
comment on column public.benefit_checks.reasoning is
  'Non-binding Bulgarian explanation of the screening result and missing factors.';

-- Realtime is optional and must be enabled for the project; this is idempotent.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'benefit_checks') then
    alter publication supabase_realtime add table public.benefit_checks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tax_assessments') then
    alter publication supabase_realtime add table public.tax_assessments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_documents') then
    alter publication supabase_realtime add table public.user_documents;
  end if;
end $$;

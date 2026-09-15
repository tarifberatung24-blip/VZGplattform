-- Tax Assessment Engine schema.
-- Apply in Supabase SQL Editor after review and backup.
-- Values are screening inputs/results, not a tax assessment or refund decision.

alter table public.tax_assessments
  add column if not exists tax_year smallint,
  add column if not exists residence_country text,
  add column if not exists tax_liability text,
  add column if not exists steuerklasse smallint,
  add column if not exists commute_distance_km numeric(8,2) not null default 0,
  add column if not exists office_days numeric(8,2) not null default 0,
  add column if not exists home_office_days numeric(8,2) not null default 0,
  add column if not exists documented_expenses numeric(12,2) not null default 0,
  add column if not exists calculated_result jsonb not null default '{}'::jsonb,
  add column if not exists screening_status text not null default 'not_indicated';

alter table public.tax_assessments
  drop constraint if exists tax_assessments_tax_year_check,
  add constraint tax_assessments_tax_year_check check (tax_year is null or tax_year between 2024 and 2025),
  drop constraint if exists tax_assessments_steuerklasse_check,
  add constraint tax_assessments_steuerklasse_check check (steuerklasse is null or steuerklasse between 1 and 6),
  drop constraint if exists tax_assessments_distance_non_negative,
  add constraint tax_assessments_distance_non_negative check (commute_distance_km >= 0),
  drop constraint if exists tax_assessments_office_days_non_negative,
  add constraint tax_assessments_office_days_non_negative check (office_days >= 0),
  drop constraint if exists tax_assessments_home_office_days_non_negative,
  add constraint tax_assessments_home_office_days_non_negative check (home_office_days >= 0),
  drop constraint if exists tax_assessments_documented_expenses_non_negative,
  add constraint tax_assessments_documented_expenses_non_negative check (documented_expenses >= 0),
  drop constraint if exists tax_assessments_screening_status_check,
  add constraint tax_assessments_screening_status_check check (screening_status in ('review_possible', 'not_indicated', 'unknown'));

create index if not exists tax_assessments_user_year_idx
  on public.tax_assessments (user_id, tax_year, created_at desc);

comment on column public.tax_assessments.calculated_result is
  'Versioned screening calculation: Pauschbetrag, Entfernungspauschale, Homeoffice and special expenses. Not a tax decision.';
comment on column public.tax_assessments.screening_status is
  'review_possible when documented Werbungskosten exceed Arbeitnehmer-Pauschbetrag; otherwise not_indicated or unknown.';

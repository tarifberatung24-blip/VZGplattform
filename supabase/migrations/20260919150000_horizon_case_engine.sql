-- HORIZON P5: canonical case model markers.
--
-- Additive only. `public.cases` is the canonical owner-scoped spine; the
-- `platform_*` family is preserved as a compatibility surface and is untouched
-- here. No policy is dropped or weakened; no historic row is rewritten.

-- Canonical HORIZON lifecycle, held separately from the legacy `status` column
-- so the narrower HORIZON vocabulary can evolve without rewriting historic
-- rows or widening the existing CHECK constraint. Nullable on purpose: rows
-- written before this migration keep NULL and are mapped on read.
alter table public.cases
  add column if not exists horizon_status text
  check (horizon_status is null or horizon_status in (
    'draft','collecting_data','waiting_for_user','processing','draft_ready',
    'review','approved','action_ready','completed','cancelled'
  ));

-- HORIZON module assignment. Nullable so pre-P5 rows are mapped from `intent`.
alter table public.cases
  add column if not exists horizon_module text
  check (horizon_module is null or horizon_module in (
    'agentur_fuer_arbeit','jobcenter','kuendigung','steuererklaerung',
    'unterlagen_erklaeren','contract_management','general'
  ));

create index if not exists cases_owner_horizon_module_idx
  on public.cases(owner_id, horizon_module);

-- Column-scoped grants only. The baseline grants insert on
-- (owner_id,title,intent,ui_locale,conversation_locale) and update on
-- (title,intent,ui_locale,conversation_locale); these extend that set to the two
-- new markers plus the two existing columns also needed on update.
grant insert (horizon_status, horizon_module) on public.cases to authenticated;
grant update (horizon_status, horizon_module, status, institution) on public.cases to authenticated;

-- The baseline grants select-only on the child tables, so client-side writes to
-- them are impossible. The canonical engine writes these rows through the
-- request-scoped session client, which means they need insert/update grants.
-- Scoped per column and per table; no table-wide grant and no policy change.
grant insert (owner_id, case_id, path, mime, size_bytes, sha256, status)
  on public.source_documents to authenticated;

grant insert (owner_id, case_id, document_id, page_no, key, value, evidence,
              source_type, confidence, critical, confirmed_at)
  on public.extracted_facts to authenticated;
grant update (confirmed_at) on public.extracted_facts to authenticated;

grant insert (owner_id, case_id, role, locale, content)
  on public.case_messages to authenticated;

grant insert (owner_id, case_id, version, subject_de, body_de, recipient,
              attachments, translation, translation_locale, model,
              prompt_version, input_facts_hash, content_hash, review_status)
  on public.correspondence_drafts to authenticated;
grant update (review_status) on public.correspondence_drafts to authenticated;

grant insert (user_id, draft_id, approved_hash) on public.approvals to authenticated;

grant insert (owner_id, case_id, type, due_at, status) on public.tasks to authenticated;
grant update (status, due_at) on public.tasks to authenticated;

grant insert (actor_id, case_id, action, metadata) on public.audit_events to authenticated;
create index if not exists inkasso_cases_document_id_idx
on public.inkasso_cases (document_id)
where document_id is not null;

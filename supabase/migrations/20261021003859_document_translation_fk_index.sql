create index document_translations_document_owner_idx
on public.document_translations(document_id, case_id, owner_id);

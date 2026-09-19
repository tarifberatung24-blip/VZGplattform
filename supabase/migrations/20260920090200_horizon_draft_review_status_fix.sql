-- HORIZON reconciliation: allow only review_status to change on a draft.
--
-- Production finding: the original `reject_draft_update` trigger rejected every
-- UPDATE, which made `setDraftReviewStatus()` impossible — the phase cannot move a
-- draft from pending review to pass/revise/block.
--
-- The rule is now: draft content stays immutable, but `review_status` may change.
-- The function body is replaced in place (`create or replace`), so the existing
-- `immutable_draft` trigger and its firing order are untouched. No row is
-- rewritten and no policy or grant is altered.

create or replace function public.reject_draft_update() returns trigger
language plpgsql
security invoker set search_path='' as $$
begin
  -- Compare the whole row with `review_status` removed. Any other difference
  -- means content changed, which must go through a new version instead.
  if (to_jsonb(old) - 'review_status') is distinct from (to_jsonb(new) - 'review_status') then
    raise exception
      'Draft content is immutable; only review_status may change. Insert a new version instead.';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_draft_update() from public, anon, authenticated;
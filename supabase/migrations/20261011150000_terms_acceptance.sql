-- Journey log, part 2: record acceptance of the terms and privacy documents, and make the usage
-- log opt-out instead of opt-in.
--
-- `user_consents` already exists (20261011140000_journey_log.sql). This only widens two CHECK
-- constraints; no data changes, no new privileges.
--
--   purpose 'terms_and_privacy': the user accepted the AGB and read the privacy, withdrawal and
--     partner notices. `text_version` names the version of those documents; `granted_at` is set on
--     the server when the checkbox is recorded.
--   purpose 'product_journey': recording is on by default. A row with granted = false is the user's
--     objection; no row, or granted = true, means recording is on.
--   source 'gate': the user accepted on the confirmation screen shown to an account that did not tick
--     the box at sign-up (for example one created through Google on the login page).

alter table public.user_consents drop constraint if exists user_consents_purpose_check;
alter table public.user_consents
  add constraint user_consents_purpose_check
  check (purpose in ('product_journey', 'terms_and_privacy'));

alter table public.user_consents drop constraint if exists user_consents_source_check;
alter table public.user_consents
  add constraint user_consents_source_check
  check (source in ('signup', 'gate', 'settings'));

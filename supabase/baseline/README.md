# KintexBG B2C database baseline

`kintexbg_b2c_v1.sql` is a consolidated, recoverable snapshot for a **new and
empty Supabase project**. It was assembled from the eight migrations recorded
in the production migration history on 2026-09-08, plus the `kindergeld_cases`
table that exists in production but is missing from that remote history.

Never apply the baseline to the existing production project. The production
project already contains these objects and data.

## Validation order

1. Create or select an isolated local/staging Supabase database.
2. Apply `kintexbg_b2c_v1.sql` to the empty database.
3. Apply `../prepared/kintex_b2c_rls_hardening.sql`.
4. Run `../tests/rls/kintex_b2c_isolation.sql` as a privileged database test
   role. It creates two synthetic customers inside a transaction and rolls the
   transaction back.
5. Run Supabase security and performance advisors.
6. Confirm that the `documents` bucket is private and only accepts PDF, JPEG,
   and PNG files up to 10 MiB.
7. Compare tables, columns, constraints, indexes, functions, triggers, grants,
   and policies against production metadata. Do not compare or copy customer
   rows.

## Production promotion

Only the reviewed hardening delta is a candidate for the existing production
project. After staging passes, create its official migration with the installed
Supabase CLI, review the generated filename and SQL, take/confirm a recoverable
backup, then apply it through the normal deployment workflow. Re-run the RLS
test with disposable test users and re-run both advisors.

The baseline, hardening delta, and behavioral test are not proof of production
correctness until those staging and post-deployment checks pass.

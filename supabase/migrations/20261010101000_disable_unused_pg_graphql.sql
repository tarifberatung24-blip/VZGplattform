-- Advisor remediation: retire the unused pg_graphql surface.
--
-- Context: this application talks to Supabase exclusively through PostgREST
-- (supabase-js) and has no GraphQL client. Nonetheless `pg_graphql` is enabled
-- and PostgREST exposes the `graphql_public` schema, so the advisor reports 81
-- warnings ("anon/authenticated can see object in GraphQL schema") for every
-- public table. Those warnings cannot be cleared by revoking SELECT: PostgREST
-- and pg_graphql share the same role grants, so revoking would break the API.
--
-- The root cause is the unused GraphQL exposure itself. Dropping the extension
-- removes the GraphQL surface without touching PostgREST access or RLS. It is
-- reversible with `create extension if not exists pg_graphql;`.
--
-- Apply together with removing `graphql_public` from the project's PostgREST
-- `db_schema` list (Supabase dashboard -> Settings -> API, or the management
-- API `PATCH /v1/projects/{ref}/postgrest`), so the schema is no longer served.

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'graphql_public') then
    execute 'revoke usage on schema graphql_public from anon, authenticated, public';
  end if;
end $$;

drop extension if exists pg_graphql cascade;

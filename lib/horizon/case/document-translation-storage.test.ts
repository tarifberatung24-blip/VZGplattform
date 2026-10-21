import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const migration = readFileSync(
  join(root, "supabase/migrations/20261021003741_document_translation_storage.sql"),
  "utf8",
)
const indexMigration = readFileSync(
  join(root, "supabase/migrations/20261021003859_document_translation_fk_index.sql"),
  "utf8",
)
const repository = readFileSync(join(root, "lib/horizon/case/repository.ts"), "utf8")

describe("per-document translation storage", () => {
  it("binds every translation to an owned source document and its exact source hash", () => {
    expect(migration).toContain("foreign key (document_id, case_id, owner_id)")
    expect(migration).toContain("references public.source_documents(id, case_id, owner_id)")
    expect(migration).toContain("source_sha256 text not null")
    expect(migration).toContain("source_locale <> target_locale")
    expect(indexMigration).toContain("(document_id, case_id, owner_id)")
  })

  it("is read-only for authenticated clients and owner-scoped by RLS", () => {
    expect(migration).toContain("enable row level security")
    expect(migration).toContain("revoke all on table public.document_translations from anon, authenticated")
    expect(migration).toContain("grant select on table public.document_translations to authenticated")
    expect(migration).toContain("using ((select auth.uid()) = owner_id)")
    expect(migration).not.toMatch(/grant\s+(insert|update|delete|all).*authenticated/i)
  })

  it("keeps translations versioned and immutable", () => {
    expect(migration).toContain("unique (document_id, target_locale, version)")
    expect(migration).toContain("immutable_document_translation")
    expect(migration).toContain("insert a new version")
  })

  it("reads through both the parent ids and the authenticated owner", () => {
    const method = repository
      .split("async listDocumentTranslations(")[1]
      .split("async listDocumentPages(")[0]
    expect(method).toContain('.eq("case_id", caseId)')
    expect(method).toContain('.eq("document_id", documentId)')
    expect(method).toContain('.eq("owner_id", this.userId)')
  })
})

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/office/supabase/database"
import {
  type Case,
  type CaseApproval,
  type CaseAuditEvent,
  type CaseDraft,
  type CaseMessage,
  type CaseModule,
  type CaseSourceDocument,
  type CaseTask,
  type DocumentPageText,
  type DraftReviewStatus,
  type ExtractedFact,
  type HorizonCaseAction,
  type HorizonCaseStatus,
  type MissingInformation,
} from "./contract"
import {
  nextCaseStatus,
  resolveCaseStatus,
  toLegacyStatus,
} from "./lifecycle"
import { buildApprovalPayload, computeContentHash, isApprovalValid } from "./approval"
import { resolveCaseModule } from "./module"
import { deriveMissingInformation } from "./missing-info"
import {
  normalizeTextIntake,
  textIntakeAuditMetadata,
  type TextIntakeKind,
} from "../intake/text"
import { buildCaseContext, type CaseContext } from "../ai/context"

type Db = Database["public"]
type CaseRow = Db["Tables"]["cases"]["Row"]
type DocumentRow = Db["Tables"]["source_documents"]["Row"]
type FactRow = Db["Tables"]["extracted_facts"]["Row"]
type MessageRow = Db["Tables"]["case_messages"]["Row"]
type DraftRow = Db["Tables"]["correspondence_drafts"]["Row"]
type ApprovalRow = Db["Tables"]["approvals"]["Row"]
type TaskRow = Db["Tables"]["tasks"]["Row"]
type AuditRow = Db["Tables"]["audit_events"]["Row"]

export type RepoResult<T> = { data: T | null; error: string | null }

const ok = <T>(data: T): RepoResult<T> => ({ data, error: null })
const fail = <T>(error: string): RepoResult<T> => ({ data: null, error })

function mapCase(row: CaseRow): Case {
  return {
    id: row.id,
    ownerId: row.owner_id,
    module: resolveCaseModule(row),
    status: resolveCaseStatus(row),
    title: row.title,
    intent: row.intent,
    uiLocale: row.ui_locale,
    conversationLocale: row.conversation_locale,
    institution: row.institution,
    deadline: row.deadline,
    createdAt: row.created_at,
  }
}

function mapDocument(row: DocumentRow): CaseSourceDocument {
  return {
    id: row.id,
    caseId: row.case_id,
    path: row.path,
    mime: row.mime,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    status: row.status,
    createdAt: row.created_at,
  }
}

function mapFact(row: FactRow): ExtractedFact {
  return {
    id: row.id,
    caseId: row.case_id,
    documentId: row.document_id,
    pageNo: row.page_no,
    key: row.key,
    value: row.value,
    evidence: row.evidence,
    sourceType: row.source_type,
    confidence: row.confidence,
    critical: row.critical,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
  }
}

function mapMessage(row: MessageRow): CaseMessage {
  return {
    id: row.id,
    caseId: row.case_id,
    role: row.role,
    locale: row.locale,
    content: row.content,
    createdAt: row.created_at,
  }
}

function mapDraft(row: DraftRow): CaseDraft {
  return {
    id: row.id,
    caseId: row.case_id,
    version: row.version,
    subject: row.subject_de,
    body: row.body_de,
    recipient: row.recipient,
    contentHash: row.content_hash,
    reviewStatus: row.review_status,
    model: row.model,
    createdAt: row.created_at,
  }
}

function mapTask(row: TaskRow): CaseTask {
  return {
    id: row.id,
    caseId: row.case_id,
    type: row.type,
    dueAt: row.due_at,
    status: row.status,
    createdAt: row.created_at,
  }
}

function mapAudit(row: AuditRow): CaseAuditEvent {
  return {
    id: row.id,
    caseId: row.case_id,
    action: row.action,
    metadata: row.metadata,
    createdAt: row.created_at,
  }
}

export type NewCaseInput = {
  title: string
  module: CaseModule
  intent: string
  uiLocale: string
  conversationLocale: string
  institution?: string | null
  deadline?: string | null
}

export type NewFactInput = {
  key: string
  value: string
  critical?: boolean
  documentId?: string | null
  pageNo?: number | null
  evidence?: string | null
  confidence?: number | null
}

export type NewDraftInput = {
  subject: string
  body: string
  recipient?: string | null
  model: string
  promptVersion: string
}

/**
 * Canonical HORIZON case engine over the owner-scoped `public.cases` spine.
 *
 * Every method filters by `owner_id`. The owning-side filter is defence in
 * depth, not the only control: the same rows are protected by `auth.uid()` RLS
 * policies. No service-role client is used here, so RLS is always in force.
 */
export class CaseEngineRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async createCase(input: NewCaseInput): Promise<RepoResult<Case>> {
    const { data, error } = await this.client
      .from("cases")
      .insert({
        owner_id: this.userId,
        title: input.title,
        intent: input.intent as CaseRow["intent"],
        ui_locale: input.uiLocale as CaseRow["ui_locale"],
        conversation_locale: input.conversationLocale as CaseRow["conversation_locale"],
        institution: input.institution ?? null,
        deadline: input.deadline ?? null,
        horizon_status: "draft" satisfies HorizonCaseStatus,
        horizon_module: input.module,
        // `status` is left to its column default ('NEW'), which is the legacy
        // value `draft` maps to. Writing it would require an extra column grant
        // for no behavioural gain on the create path.
      })
      .select("*")
      .single()
    if (error) return fail(error.message)
    await this.appendAudit(data.id, "case_created", { module: input.module })
    return ok(mapCase(data))
  }

  async listMine(limit = 50): Promise<RepoResult<Case[]>> {
    const { data, error } = await this.client
      .from("cases")
      .select("*")
      .eq("owner_id", this.userId)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) return fail(error.message)
    return ok((data ?? []).map(mapCase))
  }

  async getMine(id: string): Promise<RepoResult<Case>> {
    const { data, error } = await this.client
      .from("cases")
      .select("*")
      .eq("id", id)
      .eq("owner_id", this.userId)
      .maybeSingle()
    if (error) return fail(error.message)
    if (!data) return fail("Case not found")
    return ok(mapCase(data))
  }

  /**
   * Applies a lifecycle action. The transition table decides the outcome, so an
   * invalid action is rejected here rather than relying on the caller.
   */
  async applyAction(id: string, action: HorizonCaseAction): Promise<RepoResult<Case>> {
    const current = await this.getMine(id)
    if (current.error || !current.data) return fail(current.error ?? "Case not found")

    const target = nextCaseStatus(current.data.status, action)
    if (!target) return fail(`Action ${action} is not allowed from ${current.data.status}`)

    const { data, error } = await this.client
      .from("cases")
      .update({ horizon_status: target, status: toLegacyStatus(target) })
      .eq("id", id)
      .eq("owner_id", this.userId)
      .select("*")
      .maybeSingle()
    if (error) return fail(error.message)
    if (!data) return fail("Case not found")
    await this.appendAudit(id, "case_status_changed", { action, from: current.data.status, to: target })
    return ok(mapCase(data))
  }

  async updateDetails(
    id: string,
    patch: Partial<Pick<Case, "title" | "institution" | "deadline" | "conversationLocale">>,
  ): Promise<RepoResult<Case>> {
    const payload: Partial<CaseRow> = {}
    if (patch.title !== undefined) payload.title = patch.title
    if (patch.institution !== undefined) payload.institution = patch.institution
    if (patch.deadline !== undefined) payload.deadline = patch.deadline
    if (patch.conversationLocale !== undefined) {
      payload.conversation_locale = patch.conversationLocale as CaseRow["conversation_locale"]
    }
    if (Object.keys(payload).length === 0) return fail("No supported fields to update")

    const { data, error } = await this.client
      .from("cases")
      .update(payload)
      .eq("id", id)
      .eq("owner_id", this.userId)
      .select("*")
      .maybeSingle()
    if (error) return fail(error.message)
    if (!data) return fail("Case not found")
    return ok(mapCase(data))
  }

  async attachSourceDocument(input: {
    caseId: string
    path: string
    mime: "application/pdf" | "image/jpeg" | "image/png"
    sizeBytes: number
    sha256: string
  }): Promise<RepoResult<CaseSourceDocument>> {
    const owned = await this.getMine(input.caseId)
    if (owned.error || !owned.data) return fail(owned.error ?? "Case not found")

    const { data, error } = await this.client
      .from("source_documents")
      .insert({
        owner_id: this.userId,
        case_id: input.caseId,
        path: input.path,
        mime: input.mime,
        size_bytes: input.sizeBytes,
        sha256: input.sha256,
      })
      .select("*")
      .single()
    if (error) return fail(error.message)
    await this.appendAudit(input.caseId, "document_attached", { documentId: data.id })
    return ok(mapDocument(data))
  }

  async listDocuments(caseId: string): Promise<RepoResult<CaseSourceDocument[]>> {
    const { data, error } = await this.client
      .from("source_documents")
      .select("*")
      .eq("case_id", caseId)
      .eq("owner_id", this.userId)
      .order("created_at", { ascending: false })
    if (error) return fail(error.message)
    return ok((data ?? []).map(mapDocument))
  }

  /**
   * The extracted text of a case's documents, page-ordered, for P16.
   *
   * Read through the session client with the `owner_id` filter, so the existing
   * `document_pages_read_own` policy and this filter both apply. Returns the text
   * only — the caller classifies and quotes it, and a document whose pages were
   * never extracted simply contributes nothing rather than being guessed at.
   */
  async listDocumentPages(caseId: string): Promise<RepoResult<DocumentPageText[]>> {
    const { data, error } = await this.client
      .from("document_pages")
      .select("document_id, page_no, text_content, confidence")
      .eq("case_id", caseId)
      .eq("owner_id", this.userId)
      .order("page_no", { ascending: true })
    if (error) return fail(error.message)
    return ok(
      (data ?? []).map((row) => ({
        documentId: row.document_id,
        pageNo: row.page_no,
        text: row.text_content,
        confidence: row.confidence,
      })),
    )
  }

  async addFacts(caseId: string, facts: readonly NewFactInput[]): Promise<RepoResult<ExtractedFact[]>> {
    if (facts.length === 0) return ok([])
    const owned = await this.getMine(caseId)
    if (owned.error || !owned.data) return fail(owned.error ?? "Case not found")

    const { data, error } = await this.client
      .from("extracted_facts")
      .insert(
        facts.map((fact) => ({
          owner_id: this.userId,
          case_id: caseId,
          document_id: fact.documentId ?? null,
          page_no: fact.pageNo ?? null,
          key: fact.key,
          value: fact.value,
          evidence: fact.evidence ?? null,
          confidence: fact.confidence ?? null,
          critical: fact.critical ?? false,
          // Document-derived facts must carry evidence; user-supplied facts need none.
          source_type: (fact.documentId ? "document" : "user") as FactRow["source_type"],
        })),
      )
      .select("*")
    if (error) return fail(error.message)
    await this.appendAudit(caseId, "facts_added", { count: facts.length })
    return ok((data ?? []).map(mapFact))
  }

  async listFacts(caseId: string): Promise<RepoResult<ExtractedFact[]>> {
    const { data, error } = await this.client
      .from("extracted_facts")
      .select("*")
      .eq("case_id", caseId)
      .eq("owner_id", this.userId)
      .order("created_at", { ascending: true })
    if (error) return fail(error.message)
    return ok((data ?? []).map(mapFact))
  }

  async confirmFact(factId: string): Promise<RepoResult<ExtractedFact>> {
    const { data, error } = await this.client
      .from("extracted_facts")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("id", factId)
      .eq("owner_id", this.userId)
      .select("*")
      .maybeSingle()
    if (error) return fail(error.message)
    if (!data) return fail("Fact not found")
    await this.appendAudit(data.case_id, "fact_confirmed", { factId })
    return ok(mapFact(data))
  }

  async addMessage(
    caseId: string,
    input: { role: "user" | "assistant"; locale: string; content: string },
  ): Promise<RepoResult<CaseMessage>> {
    const trimmed = input.content.trim()
    if (trimmed.length < 1 || trimmed.length > 30000) return fail("Invalid message length")

    const { data, error } = await this.client
      .from("case_messages")
      .insert({
        owner_id: this.userId,
        case_id: caseId,
        role: input.role,
        locale: input.locale as MessageRow["locale"],
        content: trimmed,
      })
      .select("*")
      .single()
    if (error) return fail(error.message)
    return ok(mapMessage(data))
  }

  /**
   * P6 text intake: stores pasted text or email content verbatim.
   *
   * Persisted as a `user`-role message on the case spine rather than as a
   * `source_documents` row, because that table's `mime` CHECK admits only
   * PDF/JPEG/PNG and there is no file to store. The text is stored unchanged —
   * nothing is extracted from it here — and the append-only audit trail records
   * the input type, length and content hash.
   *
   * A `document`-sourced fact requires document_id, page_no and evidence (DB
   * CHECK), so text-derived facts are `user`-sourced and carry no page number.
   */
  async addTextIntake(
    caseId: string,
    input: { text: string; kind: TextIntakeKind; locale: string },
  ): Promise<RepoResult<CaseMessage>> {
    const owned = await this.getMine(caseId)
    if (owned.error || !owned.data) return fail(owned.error ?? "Case not found")

    const normalized = normalizeTextIntake(input.text, input.kind)
    if (!normalized.ok) return fail(`Text intake rejected: ${normalized.reason}`)

    const message = await this.addMessage(caseId, {
      role: "user",
      locale: input.locale,
      content: normalized.value.text,
    })
    if (message.error || !message.data) return fail(message.error ?? "Text intake failed")

    const sha256 = await computeContentHash(normalized.value.text)
    const audited = await this.appendAudit(caseId, "text_intake_added", {
      ...textIntakeAuditMetadata({
        kind: normalized.value.kind,
        characterCount: normalized.value.characterCount,
        sha256,
      }),
      message_id: message.data.id,
    })
    if (audited.error) return fail(audited.error)

    return ok(message.data)
  }

  async listMessages(caseId: string): Promise<RepoResult<CaseMessage[]>> {
    const { data, error } = await this.client
      .from("case_messages")
      .select("*")
      .eq("case_id", caseId)
      .eq("owner_id", this.userId)
      .order("created_at", { ascending: true })
    if (error) return fail(error.message)
    return ok((data ?? []).map(mapMessage))
  }

  /**
   * Stores a new immutable draft version. The content hash binds the draft to
   * its approval; the facts hash binds it to the inputs used to generate it.
   */
  async saveDraft(caseId: string, input: NewDraftInput): Promise<RepoResult<CaseDraft>> {
    const owned = await this.getMine(caseId)
    if (owned.error || !owned.data) return fail(owned.error ?? "Case not found")

    const facts = await this.listFacts(caseId)
    if (facts.error) return fail(facts.error)
    const confirmed = (facts.data ?? []).filter((fact) => fact.confirmedAt)
    const inputFactsHash = await computeContentHash(
      JSON.stringify(confirmed.map((fact) => [fact.key, fact.value]).sort()),
    )
    const contentHash = await computeContentHash(
      buildApprovalPayload({
        subject: input.subject,
        body: input.body,
        recipient: input.recipient ?? null,
      }),
    )

    const latest = await this.client
      .from("correspondence_drafts")
      .select("version")
      .eq("case_id", caseId)
      .eq("owner_id", this.userId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latest.error) return fail(latest.error.message)

    const { data, error } = await this.client
      .from("correspondence_drafts")
      .insert({
        owner_id: this.userId,
        case_id: caseId,
        version: (latest.data?.version ?? 0) + 1,
        subject_de: input.subject,
        body_de: input.body,
        recipient: input.recipient ?? null,
        model: input.model,
        prompt_version: input.promptVersion,
        input_facts_hash: inputFactsHash,
        content_hash: contentHash,
      })
      .select("*")
      .single()
    if (error) return fail(error.message)
    await this.appendAudit(caseId, "draft_saved", { draftId: data.id, version: data.version })
    return ok(mapDraft(data))
  }

  async listDrafts(caseId: string): Promise<RepoResult<CaseDraft[]>> {
    const { data, error } = await this.client
      .from("correspondence_drafts")
      .select("*")
      .eq("case_id", caseId)
      .eq("owner_id", this.userId)
      .order("version", { ascending: false })
    if (error) return fail(error.message)
    return ok((data ?? []).map(mapDraft))
  }

  async setDraftReviewStatus(
    draftId: string,
    status: DraftReviewStatus,
  ): Promise<RepoResult<CaseDraft>> {
    const { data, error } = await this.client
      .from("correspondence_drafts")
      .update({ review_status: status })
      .eq("id", draftId)
      .eq("owner_id", this.userId)
      .select("*")
      .maybeSingle()
    if (error) return fail(error.message)
    if (!data) return fail("Draft not found")
    await this.appendAudit(data.case_id, "draft_reviewed", { draftId, status })
    return ok(mapDraft(data))
  }

  /**
   * Records approval of the draft's *current* content hash. The FK to
   * (id, owner_id, content_hash) makes approval of another user's draft, or of a
   * hash the draft never had, impossible at the database level.
   */
  async recordApproval(draftId: string): Promise<RepoResult<CaseApproval>> {
    const draft = await this.client
      .from("correspondence_drafts")
      .select("*")
      .eq("id", draftId)
      .eq("owner_id", this.userId)
      .maybeSingle()
    if (draft.error) return fail(draft.error.message)
    if (!draft.data) return fail("Draft not found")

    const { data, error } = await this.client
      .from("approvals")
      .insert({
        user_id: this.userId,
        draft_id: draftId,
        approved_hash: draft.data.content_hash,
      })
      .select("*")
      .single()
    if (error) return fail(error.message)
    await this.appendAudit(draft.data.case_id, "draft_approved", { draftId })
    return ok({
      id: data.id,
      caseId: draft.data.case_id,
      draftId: data.draft_id,
      approvedHash: data.approved_hash,
      approvedAt: data.approved_at,
    })
  }

  async listApprovals(caseId: string): Promise<RepoResult<CaseApproval[]>> {
    const drafts = await this.listDrafts(caseId)
    if (drafts.error) return fail(drafts.error)
    const draftIds = (drafts.data ?? []).map((draft) => draft.id)
    if (draftIds.length === 0) return ok([])

    const { data, error } = await this.client
      .from("approvals")
      .select("*")
      .eq("user_id", this.userId)
      .in("draft_id", draftIds)
    if (error) return fail(error.message)
    return ok(
      (data ?? []).map((row: ApprovalRow) => ({
        id: row.id,
        caseId,
        draftId: row.draft_id,
        approvedHash: row.approved_hash,
        approvedAt: row.approved_at,
      })),
    )
  }

  /**
   * Whether the draft's current content is still approved. A changed body
   * produces a different hash, so the stored approval stops matching and no
   * historic approval row is modified or deleted.
   */
  /**
   * The attachment rows recorded on one draft, owner-scoped.
   *
   * A narrow read rather than widening `CaseDraft`, because only the send engine
   * needs attachment provenance and widening the shared draft shape would ripple
   * into every existing consumer of the P5 model.
   */
  async getDraftAttachments(
    caseId: string,
    draftId: string,
  ): Promise<RepoResult<unknown>> {
    const { data, error } = await this.client
      .from("correspondence_drafts")
      .select("attachments")
      .eq("id", draftId)
      .eq("case_id", caseId)
      .eq("owner_id", this.userId)
      .maybeSingle()
    if (error) return fail(error.message)
    if (!data) return fail("Draft not found")
    return ok(data.attachments)
  }

  async getApprovalState(draftId: string): Promise<RepoResult<{ approved: boolean }>> {
    const draft = await this.client
      .from("correspondence_drafts")
      .select("content_hash")
      .eq("id", draftId)
      .eq("owner_id", this.userId)
      .maybeSingle()
    if (draft.error) return fail(draft.error.message)
    if (!draft.data) return fail("Draft not found")
    const currentHash = draft.data.content_hash

    const { data, error } = await this.client
      .from("approvals")
      .select("approved_hash")
      .eq("draft_id", draftId)
      .eq("user_id", this.userId)
    if (error) return fail(error.message)

    const approved = (data ?? []).some((row) => isApprovalValid(row.approved_hash, currentHash))
    return ok({ approved })
  }

  async createTask(
    caseId: string,
    input: { type: "reminder" | "human_review"; dueAt?: string | null },
  ): Promise<RepoResult<CaseTask>> {
    const owned = await this.getMine(caseId)
    if (owned.error || !owned.data) return fail(owned.error ?? "Case not found")

    const { data, error } = await this.client
      .from("tasks")
      .insert({ owner_id: this.userId, case_id: caseId, type: input.type, due_at: input.dueAt ?? null })
      .select("*")
      .single()
    if (error) return fail(error.message)
    await this.appendAudit(caseId, "task_created", { taskId: data.id, type: input.type })
    return ok(mapTask(data))
  }

  async updateTask(
    taskId: string,
    patch: { status?: CaseTask["status"]; dueAt?: string | null },
  ): Promise<RepoResult<CaseTask>> {
    const payload: Partial<TaskRow> = {}
    if (patch.status !== undefined) payload.status = patch.status
    if (patch.dueAt !== undefined) payload.due_at = patch.dueAt
    if (Object.keys(payload).length === 0) return fail("No supported fields to update")

    const { data, error } = await this.client
      .from("tasks")
      .update(payload)
      .eq("id", taskId)
      .eq("owner_id", this.userId)
      .select("*")
      .maybeSingle()
    if (error) return fail(error.message)
    if (!data) return fail("Task not found")
    return ok(mapTask(data))
  }

  async listTasks(caseId: string): Promise<RepoResult<CaseTask[]>> {
    const { data, error } = await this.client
      .from("tasks")
      .select("*")
      .eq("case_id", caseId)
      .eq("owner_id", this.userId)
      .order("created_at", { ascending: true })
    if (error) return fail(error.message)
    return ok((data ?? []).map(mapTask))
  }

  async appendAudit(
    caseId: string | null,
    action: string,
    metadata: Record<string, unknown> = {},
  ): Promise<RepoResult<CaseAuditEvent>> {
    const { data, error } = await this.client
      .from("audit_events")
      .insert({ actor_id: this.userId, case_id: caseId, action, metadata })
      .select("*")
      .single()
    if (error) return fail(error.message)
    return ok(mapAudit(data))
  }

  /** Audit reads are scoped to the acting user as well as the case. */
  async listAudit(caseId: string): Promise<RepoResult<CaseAuditEvent[]>> {
    const { data, error } = await this.client
      .from("audit_events")
      .select("*")
      .eq("case_id", caseId)
      .eq("actor_id", this.userId)
      .order("created_at", { ascending: false })
    if (error) return fail(error.message)
    return ok((data ?? []).map(mapAudit))
  }

  async getMissingInformation(caseId: string): Promise<RepoResult<MissingInformation>> {
    const owned = await this.getMine(caseId)
    if (owned.error || !owned.data) return fail(owned.error ?? "Case not found")
    const facts = await this.listFacts(caseId)
    if (facts.error) return fail(facts.error)
    return ok(deriveMissingInformation(facts.data ?? [], owned.data.module))
  }

  /**
   * P7 persistent case context: everything the assistant is allowed to see,
   * assembled from the owner-scoped spine.
   *
   * Approval state is read from the stored hashes, so a draft whose content
   * changed after approval is reported as not approved rather than carrying a
   * stale approval forward.
   */
  async loadCaseContext(caseId: string): Promise<RepoResult<CaseContext>> {
    const owned = await this.getMine(caseId)
    if (owned.error || !owned.data) return fail(owned.error ?? "Case not found")

    const [facts, drafts, documents, missing] = await Promise.all([
      this.listFacts(caseId),
      this.listDrafts(caseId),
      this.listDocuments(caseId),
      this.getMissingInformation(caseId),
    ])
    if (facts.error) return fail(facts.error)
    if (drafts.error) return fail(drafts.error)
    if (documents.error) return fail(documents.error)
    if (missing.error) return fail(missing.error)

    const draftList = drafts.data ?? []
    const approvalChecks = await Promise.all(
      draftList.map(async (draft) => {
        const state = await this.getApprovalState(draft.id)
        return state.data?.approved ? draft.id : null
      }),
    )

    return ok(
      buildCaseContext({
        case: owned.data,
        facts: facts.data ?? [],
        drafts: draftList,
        missing: missing.data ?? null,
        approvedDraftIds: approvalChecks.filter((id): id is string => id !== null),
        documentCount: (documents.data ?? []).length,
      }),
    )
  }
}
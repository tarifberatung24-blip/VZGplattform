"use client"

import { TextIntakeForm } from "@/components/guide/text-intake-form"
import { DocumentIntakeForm } from "@/components/guide/document-intake-form"
import { DocumentExtractButton } from "@/components/guide/document-extract-button"
import { CaseAssistantPanel } from "@/components/guide/case-assistant-panel"
import { DraftReviewPanel } from "@/components/guide/draft-review-panel"
import { OfficialFormPanel } from "@/components/guide/official-form-panel"
import { SendPanel } from "@/components/guide/send-panel"
import { SignaturePanel } from "@/components/guide/signature-panel"
import { AgenturTaskPanel } from "@/components/agentur/agentur-task-panel"
import { JobcenterTaskPanel } from "@/components/jobcenter/jobcenter-task-panel"
import { KuendigungPanel } from "@/components/kuendigung/kuendigung-panel"
import { SteuerPanel } from "@/components/steuer/steuer-panel"
import { UnterlagenPanel } from "@/components/unterlagen/unterlagen-panel"
import { documentDisplayName } from "@/lib/horizon/intake/document"
import {
  documentStatusLabel,
  draftReviewStatusLabel,
  factKeyLabel,
  taskStatusLabel,
  taskTypeLabel,
} from "@/lib/horizon/guide/copy"
import type { Locale } from "@/lib/i18n/dictionaries"
import { assessDraftRelease } from "@/lib/horizon/case/release"
import { pickSendableDraft } from "@/lib/horizon/send/marker"
import {
  selectedAgenturTask,
  selectedJobcenterTask,
  selectedTaxYear,
} from "@/lib/horizon/case/missing-info"
import type {
  CaseApproval,
  CaseAuditEvent,
  CaseDraft,
  CaseSourceDocument,
  CaseTask,
  ExtractedFact,
  MissingInformation,
} from "@/lib/horizon/case/contract"

export type CaseWorkspaceProps = {
  caseId: string
  locale: string
  module: string
  documents: readonly CaseSourceDocument[]
  facts: readonly ExtractedFact[]
  drafts: readonly CaseDraft[]
  tasks: readonly CaseTask[]
  missing: MissingInformation | null
  approvals: readonly CaseApproval[]
  audit: readonly CaseAuditEvent[]
  /** P16: combined extracted text of the case's documents, or "" when none. */
  documentText?: string
}

function Panel({
  id,
  title,
  empty,
  children,
}: {
  id?: string
  title: string
  empty: string
  children: React.ReactNode
}) {
  const hasContent = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <section id={id} className="rounded-md border border-border bg-card p-4 sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-2">
        {hasContent ? (
          children
        ) : (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            {empty}
          </p>
        )}
      </div>
    </section>
  )
}

/**
 * Read-only view of the canonical case spine, plus the P6 text intake control.
 *
 * Mutating controls for later phases (upload, confirm, ask, draft, approve) are
 * added by the phases that implement them. Nothing here simulates an action it
 * cannot actually perform, so the surface never implies progress that did not
 * happen.
 */
export function CaseWorkspace({
  caseId,
  locale,
  module,
  documents,
  facts,
  drafts,
  tasks,
  missing,
  approvals,
  audit,
  documentText,
}: CaseWorkspaceProps) {
  const de = locale === "de"

  const copy = de
    ? {
        intake: "Text aufnehmen",
        fileIntake: "Datei anhängen",
        documents: "Dokumente",
        facts: "Fakten",
        drafts: "Entwürfe",
        draftReview: "Entwurf prüfen und freigeben",
        officialForm: "Amtliches Formular",
        signature: "Sichtbare Signatur",
        send: "Versand",
        tasks: "Aufgaben",
        missing: "Fehlende Angaben",
        audit: "Verlauf",
        none: "Noch keine Einträge.",
        missingNone: "Keine fehlenden Pflichtangaben erkannt.",
        missingHas: "Vor dem Fortfahren zu klären:",
        unconfirmed: "Unbestätigt",
        confirmed: "Bestätigt",
        page: "Seite",
        version: "Version",
        fromDocument: "aus Dokument",
        fromUser: "vom Nutzer",
        noEvidence: "Kein Belegtext",
      }
    : {
        intake: "Въвеждане на текст",
        fileIntake: "Прикачване на файл",
        documents: "Документи",
        facts: "Факти",
        drafts: "Чернови",
        draftReview: "Преглед и одобрение на чернова",
        officialForm: "Официален формуляр",
        signature: "Видима сигнатура",
        send: "Изпращане",
        tasks: "Задачи",
        missing: "Липсващи данни",
        audit: "История",
        none: "Още няма записи.",
        missingNone: "Няма открити липсващи задължителни данни.",
        missingHas: "За изясняване преди продължаване:",
        unconfirmed: "Непотвърден",
        confirmed: "Потвърден",
        page: "Страница",
        version: "Версия",
        fromDocument: "от документ",
        fromUser: "от потребител",
        noEvidence: "Няма текст-основание",
      }

  // Release is assessed for the newest draft version, which is the one the user
  // is being asked to approve.
  const latestDraft = drafts[0] ?? null
  const release = assessDraftRelease({ draft: latestDraft, missing, approvals })

  // A send is itself stored as a draft (the send record), and always as a newer
  // version than the message it records. Sending the newest draft would therefore
  // offer the *record* for sending and hide the explicit-resend path the engine
  // implements, so the send panel is pointed at the newest draft that is not a
  // send record. `isSendRecordDraft` is the client-safe half of the marker check.
  const sendableDraft = pickSendableDraft(drafts)

  // A truthful progress spine derived only from stored state. Every value here is
  // something the engine actually recorded; nothing is inferred or simulated.
  const confirmedFacts = facts.filter((fact) => fact.confirmedAt).length
  const missingCount =
    (missing?.missingFactKeys.length ?? 0) + (missing?.unconfirmedCriticalFactKeys.length ?? 0)
  const hasApproval = approvals.length > 0

  const nextStep = (() => {
    if (documents.length === 0 && facts.length === 0) {
      return {
        text: de ? "Füge zuerst ein Dokument oder einen Text hinzu." : "Добави първо документ или текст.",
        anchor: "case-intake",
      }
    }
    if (missingCount > 0) {
      return {
        text: de
          ? `${missingCount} Angaben fehlen noch — kläre sie vor dem Fortfahren.`
          : `Липсват още ${missingCount} данни — изясни ги преди да продължиш.`,
        anchor: "case-missing",
      }
    }
    if (!latestDraft) {
      return {
        text: de
          ? "Erstelle einen Entwurf aus den bestätigten Angaben."
          : "Създай чернова от потвърдените данни.",
        anchor: "case-drafts",
      }
    }
    if (!release.releasable) {
      return {
        text: de
          ? "Prüfe den Entwurf und gib ihn frei."
          : "Прегледай черновата и я одобри.",
        anchor: "case-draft-review",
      }
    }
    if (!hasApproval) {
      return {
        text: de
          ? "Der Entwurf ist bereit — bestätige die Freigabe."
          : "Черновата е готова — потвърди одобрението.",
        anchor: "case-draft-review",
      }
    }
    return {
      text: de
        ? "Alles vorbereitet — der Versand ist der letzte Schritt."
        : "Всичко е подготвено — изпращането е последната стъпка.",
      anchor: "case-send",
    }
  })()

  const steps = [
    { label: de ? "Dokumente" : "Документи", value: `${documents.length}`, done: documents.length > 0 },
    { label: de ? "Bestätigte Fakten" : "Потвърдени факти", value: `${confirmedFacts}/${facts.length}`, done: facts.length > 0 && confirmedFacts === facts.length },
    { label: de ? "Fehlende Angaben" : "Липсващи данни", value: `${missingCount}`, done: missingCount === 0, alert: missingCount > 0 },
    { label: de ? "Entwurf" : "Чернова", value: latestDraft ? `${de ? "v" : "в"}${latestDraft.version}` : "—", done: Boolean(latestDraft) && release.releasable },
  ]

  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-md border border-border bg-card p-4 sm:p-5" aria-label={de ? "Vorgangsstatus" : "Състояние на случая"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {de ? "Nächster Schritt" : "Следваща стъпка"}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{nextStep.text}</p>
          </div>
          <a
            href={`#${nextStep.anchor}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            {de ? "Zum Schritt" : "Към стъпката"}
          </a>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((step) => (
            <div key={step.label} className="rounded-md border border-border bg-background p-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {step.label}
              </dt>
              <dd className={`mt-1 text-lg font-semibold tabular-nums ${step.alert ? "text-destructive" : step.done ? "text-success" : "text-foreground"}`}>
                {step.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <AgenturTaskPanel
        caseId={caseId}
        locale={locale}
        module={module}
        selectedTask={selectedAgenturTask(facts)}
      />

      <JobcenterTaskPanel
        caseId={caseId}
        locale={locale}
        module={module}
        selectedTask={selectedJobcenterTask(facts)}
        facts={facts}
      />

      <KuendigungPanel
        caseId={caseId}
        locale={locale}
        module={module}
        facts={facts}
        missing={missing}
        drafts={drafts}
        approvals={approvals}
      />

      <SteuerPanel
        caseId={caseId}
        locale={locale}
        module={module}
        selectedYear={selectedTaxYear(facts)}
        facts={facts}
        drafts={drafts}
        approvals={approvals}
      />

      <UnterlagenPanel
        caseId={caseId}
        locale={locale}
        module={module}
        documentText={documentText ?? ""}
        facts={facts}
        unconfirmedFactCount={missing?.unconfirmedCriticalFactKeys.length ?? 0}
      />

      <CaseAssistantPanel caseId={caseId} module={module} locale={locale} />

      <div className="grid gap-4 lg:grid-cols-2">
      <Panel id="case-intake" title={copy.intake} empty={copy.none}>
        <TextIntakeForm caseId={caseId} locale={locale} />
      </Panel>

      <Panel title={copy.fileIntake} empty={copy.none}>
        <DocumentIntakeForm caseId={caseId} locale={locale} />
      </Panel>

      <Panel id="case-missing" title={copy.missing} empty={copy.missingNone}>
        {missing && !missing.complete ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">{copy.missingHas}</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {[...missing.missingFactKeys, ...missing.unconfirmedCriticalFactKeys].map((key) => (
                <li key={key} className="rounded border border-border bg-secondary px-2 py-1">
                  {factKeyLabel(locale as Locale, key)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>

      <Panel title={copy.facts} empty={copy.none}>
        {facts.map((fact) => (
          <div key={fact.id} className="border-b border-border/70 pb-2 last:border-0">
            <p className="text-sm font-medium">
              {fact.key}: {fact.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fact.confirmedAt ? copy.confirmed : copy.unconfirmed} ·{" "}
              {fact.sourceType === "document" ? copy.fromDocument : copy.fromUser}
              {fact.pageNo ? ` · ${copy.page} ${fact.pageNo}` : ""}
              {fact.confidence != null ? ` · ${Math.round(fact.confidence * 100)}%` : ""}
            </p>
            <p className="mt-0.5 text-xs italic text-muted-foreground">
              {fact.evidence ?? copy.noEvidence}
            </p>
          </div>
        ))}
      </Panel>

      <Panel title={copy.documents} empty={copy.none}>
        {documents.map((doc) => (
          <div key={doc.id} className="border-b border-border/70 pb-2 last:border-0">
            <p className="truncate text-sm font-medium">{documentDisplayName(doc.path)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {doc.mime} · {Math.round(doc.sizeBytes / 1024)} KB ·{" "}
              {documentStatusLabel(locale as Locale, doc.status)}
            </p>
            <DocumentExtractButton
              caseId={caseId}
              documentId={doc.id}
              locale={locale}
              status={doc.status}
            />
          </div>
        ))}
      </Panel>

      <Panel id="case-drafts" title={copy.drafts} empty={copy.none}>
        {drafts.map((draft) => (
          <div key={draft.id} className="border-b border-border/70 pb-2 last:border-0">
            <p className="text-sm font-medium">{draft.subject}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {copy.version} {draft.version} ·{" "}
              {draftReviewStatusLabel(locale as Locale, draft.reviewStatus)}
            </p>
          </div>
        ))}
      </Panel>

      <Panel title={copy.officialForm} empty={copy.none}>
        <OfficialFormPanel
          caseId={caseId}
          locale={locale}
          module={module}
          taxYear={selectedTaxYear(facts)}
        />
      </Panel>

      <Panel id="case-draft-review" title={copy.draftReview} empty={copy.none}>
        <DraftReviewPanel
          caseId={caseId}
          locale={locale}
          draft={latestDraft}
          release={release}
        />
      </Panel>

      <Panel title={copy.signature} empty={copy.none}>
        <SignaturePanel caseId={caseId} locale={locale} />
      </Panel>

      <Panel id="case-send" title={copy.send} empty={copy.none}>
        <SendPanel caseId={caseId} locale={locale} draftId={sendableDraft?.id ?? null} />
      </Panel>

      <Panel title={copy.tasks} empty={copy.none}>
        {tasks.map((task) => (
          <div key={task.id} className="border-b border-border/70 pb-2 last:border-0">
            <p className="text-sm font-medium">{taskTypeLabel(locale as Locale, task.type)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {taskStatusLabel(locale as Locale, task.status)}
              {task.dueAt ? ` · ${task.dueAt}` : ""}
            </p>
          </div>
        ))}
      </Panel>

      <Panel title={copy.audit} empty={copy.none}>
        {audit.map((event) => (
          <div key={event.id} className="border-b border-border/70 pb-2 last:border-0">
            <p className="text-sm font-medium">{event.action}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{event.createdAt}</p>
          </div>
        ))}
      </Panel>
      </div>
    </div>
  )
}
import Link from "next/link"
import { notFound } from "next/navigation"
import { requireGuideContext } from "@/lib/horizon/guide/guard"
import { getGuideCopy, guideCaseDisplayTitle, guideModuleLabel, caseStatusLabel } from "@/lib/horizon/guide/copy"
import { combineAnalysisText } from "@/lib/horizon/unterlagen/analysis"
import { documentDisplayName } from "@/lib/horizon/intake/document"
import { isLocale } from "@/lib/i18n/dictionaries"
import { WorkspacePage } from "@/components/layout/workspace-page-header"
import { CaseWorkspace } from "@/components/guide/case-workspace"
import { BrandText } from "@/components/brand/horizon-wordmark"
import { loadGuideReadiness } from "@/lib/horizon/guide/readiness"

export const dynamic = "force-dynamic"

export default async function GuideCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; caseId: string }>
  searchParams: Promise<{ notice?: string }>
}) {
  const [{ locale: rawLocale, caseId }, { notice }] = await Promise.all([params, searchParams])
  const locale = isLocale(rawLocale) ? rawLocale : "bg"
  const { engine } = await requireGuideContext(locale, `/${locale}/guide/${caseId}`)

  const loaded = await engine.repository!.getMine(caseId)
  // A case belonging to another user is indistinguishable from a missing one,
  // which keeps case existence from leaking across accounts.
  if (loaded.error || !loaded.data) notFound()

  const [documents, facts, drafts, tasks, missing, approvals, audit, pages, messages, readiness] =
    await Promise.all([
      engine.repository!.listDocuments(caseId),
      engine.repository!.listFacts(caseId),
      engine.repository!.listDrafts(caseId),
      engine.repository!.listTasks(caseId),
      engine.repository!.getMissingInformation(caseId),
      engine.repository!.listApprovals(caseId),
      engine.repository!.listAudit(caseId),
      engine.repository!.listDocumentPages(caseId),
      engine.repository!.listMessages(caseId),
      loadGuideReadiness(engine.userId),
    ])

  // P16 analyses everything the user supplied: extracted page text plus pasted
  // text and email content, which P6 stores verbatim as user messages.
  const documentText = combineAnalysisText({
    pages: (pages.data ?? []).map((page) => page.text),
    messages: messages.data ?? [],
  })

  // The same sources, kept apart, so each P16 quote can name the page it is on.
  // Pages follow the case's document order, then page number, so the first
  // match is stable between renders.
  const documentOrder = new Map((documents.data ?? []).map((doc, index) => [doc.id, index]))
  const documentNames = new Map(
    (documents.data ?? []).map((doc) => [doc.id, documentDisplayName(doc.path)]),
  )
  const evidenceSources = {
    pages: (pages.data ?? [])
      .filter((page) => documentNames.has(page.documentId))
      .map((page) => ({
        documentId: page.documentId,
        pageNo: page.pageNo,
        documentName: documentNames.get(page.documentId) ?? "",
        text: page.text,
      }))
      .sort(
        (a, b) =>
          (documentOrder.get(a.documentId) ?? 0) - (documentOrder.get(b.documentId) ?? 0) ||
          a.pageNo - b.pageNo,
      ),
    pastedTexts: (messages.data ?? [])
      .filter((message) => message.role === "user")
      .map((message) => message.content),
  }

  const copy = getGuideCopy(locale)

  return (
    <WorkspacePage>
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/${locale}/guide`}
          className="text-xs font-medium text-primary hover:underline"
        >
          ← {copy.backToGuide}
        </Link>

        <header className="mt-4 border-b border-border pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            <BrandText text={guideCaseDisplayTitle(locale, loaded.data.intent, loaded.data.title)} />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.moduleLabel}: {guideModuleLabel(locale, loaded.data.module)} ·{" "}
            {copy.statusLabel}: {caseStatusLabel(locale, loaded.data.status)}
          </p>
        </header>

        {notice === "intake-not-saved" ? (
          <p role="alert" className="paper paper-note paper-note-danger mt-6 px-4 py-3 text-sm text-destructive">
            {locale === "de"
              ? "Deine Situationsbeschreibung konnte nicht gespeichert werden. Du kannst sie unten erneut einfügen."
              : "Описанието на ситуацията не можа да се запази. Можеш да го поставиш отново по-долу."}
          </p>
        ) : null}

        <CaseWorkspace
          caseId={caseId}
          locale={locale}
          module={loaded.data.module}
          status={loaded.data.status}
          intent={loaded.data.intent}
          applicationReadiness={readiness}
          documents={documents.data ?? []}
          facts={facts.data ?? []}
          drafts={drafts.data ?? []}
          tasks={tasks.data ?? []}
          missing={missing.data ?? null}
          approvals={approvals.data ?? []}
          audit={audit.data ?? []}
          documentText={documentText}
          evidenceSources={evidenceSources}
        />
      </div>
    </WorkspacePage>
  )
}

import Link from "next/link"
import { notFound } from "next/navigation"
import { requireGuideContext } from "@/lib/horizon/guide/guard"
import { getGuideCopy, guideModuleLabel } from "@/lib/horizon/guide/copy"
import { isLocale } from "@/lib/i18n/dictionaries"
import { CaseWorkspace } from "@/components/guide/case-workspace"

export const dynamic = "force-dynamic"

export default async function GuideCasePage({
  params,
}: {
  params: Promise<{ locale: string; caseId: string }>
}) {
  const { locale: rawLocale, caseId } = await params
  const locale = isLocale(rawLocale) ? rawLocale : "bg"
  const { engine } = await requireGuideContext(locale, `/${locale}/guide/${caseId}`)

  const loaded = await engine.repository!.getMine(caseId)
  // A case belonging to another user is indistinguishable from a missing one,
  // which keeps case existence from leaking across accounts.
  if (loaded.error || !loaded.data) notFound()

  const [documents, facts, drafts, tasks, missing, approvals, audit] = await Promise.all([
    engine.repository!.listDocuments(caseId),
    engine.repository!.listFacts(caseId),
    engine.repository!.listDrafts(caseId),
    engine.repository!.listTasks(caseId),
    engine.repository!.getMissingInformation(caseId),
    engine.repository!.listApprovals(caseId),
    engine.repository!.listAudit(caseId),
  ])

  const copy = getGuideCopy(locale)

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/${locale}/guide`}
          className="text-xs font-medium text-primary hover:underline"
        >
          ← {copy.backToGuide}
        </Link>

        <header className="mt-4 border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {copy.brand}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{loaded.data.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.moduleLabel}: {guideModuleLabel(locale, loaded.data.module)} ·{" "}
            {copy.statusLabel}: {loaded.data.status}
          </p>
        </header>

        <CaseWorkspace
          caseId={caseId}
          locale={locale}
          module={loaded.data.module}
          documents={documents.data ?? []}
          facts={facts.data ?? []}
          drafts={drafts.data ?? []}
          tasks={tasks.data ?? []}
          missing={missing.data ?? null}
          approvals={approvals.data ?? []}
          audit={audit.data ?? []}
        />
      </div>
    </main>
  )
}
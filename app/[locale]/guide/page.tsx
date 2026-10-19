import { requireGuideContext } from "@/lib/horizon/guide/guard"
import { GuideChooser } from "@/components/guide/guide-chooser"
import { resolveCaseModule } from "@/lib/horizon/case/module"
import { loadGuideReadiness } from "@/lib/horizon/guide/readiness"
import { guideCaseDisplayTitle } from "@/lib/horizon/guide/copy"
import { isLocale } from "@/lib/i18n/dictionaries"

export const dynamic = "force-dynamic"

export default async function GuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const [{ locale: rawLocale }, { error }] = await Promise.all([params, searchParams])
  const locale = isLocale(rawLocale) ? rawLocale : "bg"
  const { engine } = await requireGuideContext(locale, `/${locale}/guide`)

  const listed = await engine.repository!.listMine(20)
  const openCases = (listed.data ?? []).map((item) => ({
    id: item.id,
    title: guideCaseDisplayTitle(locale, item.intent, item.title),
    module: resolveCaseModule(item),
    status: item.status,
    createdAt: item.createdAt,
  }))

  const readiness = await loadGuideReadiness(engine.userId)

  return <GuideChooser openCases={openCases} errorCode={error ?? null} readiness={readiness} />
}

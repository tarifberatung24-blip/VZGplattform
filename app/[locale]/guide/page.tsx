import { requireGuideContext } from "@/lib/horizon/guide/guard"
import { GuideChooser } from "@/components/guide/guide-chooser"
import { resolveCaseModule } from "@/lib/horizon/case/module"

export const dynamic = "force-dynamic"

export default async function GuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const [{ locale }, { error }] = await Promise.all([params, searchParams])
  const { engine } = await requireGuideContext(locale, `/${locale}/guide`)

  const listed = await engine.repository!.listMine(20)
  const openCases = (listed.data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    module: resolveCaseModule(item),
    status: item.status,
    createdAt: item.createdAt,
  }))

  return <GuideChooser openCases={openCases} errorCode={error ?? null} />
}
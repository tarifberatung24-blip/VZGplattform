import { notFound } from "next/navigation"
import { getEditorEmail, loadPage } from "@/lib/puck/pages"
import { EditorClient } from "./editor-client"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ slug?: string }>
}

export default async function AdminEditorPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { slug = "home" } = await searchParams
  if (locale !== "bg" && locale !== "de") notFound()
  if (!(await getEditorEmail())) notFound()
  const page = await loadPage(locale, slug, { publishedOnly: false })
  return <EditorClient locale={locale} slug={slug} initial={page?.data ?? null} published={page?.published ?? false} />
}

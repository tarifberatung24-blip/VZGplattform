import { notFound } from "next/navigation"
import { Render } from "@puckeditor/core"
import { puckConfig } from "@/lib/puck/config"
import { loadPage } from "@/lib/puck/pages"

export const dynamic = "force-dynamic"

export default async function PublicEditedPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  if (locale !== "bg" && locale !== "de") notFound()
  const page = await loadPage(locale, slug, { publishedOnly: true })
  if (!page) notFound()
  return <main className="mx-auto max-w-4xl px-4 py-8"><Render config={puckConfig} data={page.data} /></main>
}

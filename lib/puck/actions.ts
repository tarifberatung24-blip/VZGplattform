"use server"

import type { Data } from "@puckeditor/core"
import { savePage, type PageLocale } from "./pages"

export async function savePageAction(locale: PageLocale, slug: string, data: Data, published: boolean) {
  if (locale !== "bg" && locale !== "de") return { error: "Invalid locale" as const }
  return savePage(locale, slug, data, published)
}

"use client"

import { Puck, type Data } from "@puckeditor/core"
import "@puckeditor/core/puck.css"
import { puckConfig } from "@/lib/puck/config"
import { savePageAction } from "@/lib/puck/actions"

const empty: Data = { content: [], root: { props: {} } }

export function EditorClient({ locale, slug, initial, published }: { locale: "bg" | "de"; slug: string; initial: Data | null; published: boolean }) {
  return (
    <Puck
      config={puckConfig}
      data={initial ?? empty}
      onPublish={async (data) => {
        const res = await savePageAction(locale, slug, data, true)
        window.alert("error" in res ? `Грешка: ${res.error}` : `Публикувано: /${locale}/p/${slug}`)
      }}
      overrides={{
        headerActions: ({ children }) => (
          <>
            <span style={{ fontSize: 12, opacity: 0.7 }}>/{locale}/p/{slug} {published ? "· публикувана" : "· чернова"}</span>
            {children}
          </>
        ),
      }}
    />
  )
}

import type { Metadata } from "next"
import { ModulePage } from "@/components/marketing/module-page"

export const metadata: Metadata = {
  title: "Layer 0 — HORIZON by VZG",
  description: "Was dieses Modul für dich übernimmt.",
}

export default function Page() {
  return <ModulePage moduleId="steuern" />
}

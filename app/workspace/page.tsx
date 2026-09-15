import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { WorkspaceOverview } from "@/components/workspace/WorkspaceOverview"

export const metadata = { title: "Workspace | VZGplattform", description: "Личен преглед на данъци, помощи и документи." }

export default function WorkspacePage() {
  return <main className="min-h-screen bg-background"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12"><Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Към началото</Link><WorkspaceOverview /></div></main>
}

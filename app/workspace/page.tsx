import { WorkspaceOverview } from "@/components/workspace/WorkspaceOverview"

export const metadata = {
  title: "Вашият преглед | VZGplattform",
  description: "Вашите данъчни изчисления, възможни помощи и документи.",
}

export default function WorkspacePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <WorkspaceOverview />
      </div>
    </main>
  )
}

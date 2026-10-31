import type { ComponentType } from "react"
import {
  BadgeEuro,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  FileCheck2,
  FileQuestion,
  FileSignature,
  FileText,
  FileWarning,
  FolderOpen,
  Landmark,
  MessagesSquare,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react"

import type { HowItWorksServiceId } from "./how-it-works-copy"

/**
 * The icon per service id, shared by the "How it works" page and the Learning Center.
 *
 * Both surfaces render the same sixteen services, so the icon for a service lives
 * here once rather than being re-declared on each page and drifting apart.
 */
export const serviceIcons: Record<HowItWorksServiceId, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  guide: FileQuestion,
  document_explanation: FileCheck2,
  inkasso: FileWarning,
  documents: FolderOpen,
  vorlagen: FileSignature,
  agentur: BriefcaseBusiness,
  jobcenter: Building2,
  termination: FileText,
  tax: ReceiptText,
  entitlements: Landmark,
  kindergeld: ShieldCheck,
  contracts: WalletCards,
  cost_reduction: BadgeEuro,
  insurance: ShieldCheck,
  education: BookOpen,
  forum: MessagesSquare,
}

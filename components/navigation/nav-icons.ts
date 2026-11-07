import {
  Compass,
  FileWarning,
  FileText,
  GraduationCap,
  ListChecks,
  MessagesSquare,
  LayoutDashboard,
  BriefcaseBusiness,
  Receipt,
  ShieldCheck,
  TrendingUp,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

import type { NavDestinationId } from "@/lib/navigation/horizon-nav"

/** Presentation only. The destination list lives in lib/navigation/horizon-nav.ts. */
export const navIcons: Record<NavDestinationId, LucideIcon> = {
  dashboard: LayoutDashboard,
  business: BriefcaseBusiness,
  guide: Compass,
  documents: FileText,
  inkasso: FileWarning,
  schufa: TrendingUp,
  runs: ListChecks,
  contracts: WalletCards,
  taxes: Receipt,
  education: GraduationCap,
  forum: MessagesSquare,
  profile: UserRound,
  security: ShieldCheck,
}

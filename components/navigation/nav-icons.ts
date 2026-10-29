import {
  Compass,
  FileWarning,
  FileText,
  GraduationCap,
  MessagesSquare,
  LayoutDashboard,
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
  guide: Compass,
  documents: FileText,
  inkasso: FileWarning,
  schufa: TrendingUp,
  contracts: WalletCards,
  taxes: Receipt,
  education: GraduationCap,
  forum: MessagesSquare,
  profile: UserRound,
  security: ShieldCheck,
}

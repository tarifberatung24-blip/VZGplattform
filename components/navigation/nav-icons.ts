import {
  Compass,
  FileText,
  GraduationCap,
  MessagesSquare,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
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
  contracts: WalletCards,
  taxes: Receipt,
  education: GraduationCap,
  forum: MessagesSquare,
  profile: UserRound,
  security: ShieldCheck,
}

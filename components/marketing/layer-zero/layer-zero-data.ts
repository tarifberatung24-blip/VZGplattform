import {
  BarChart3,
  Briefcase,
  FileSignature,
  FileText,
  FileWarning,
  Receipt,
  Scale,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"

export type LayerZeroModuleId =
  | "inkasso"
  | "steuern"
  | "tarife"
  | "rechte"
  | "kindergeld"
  | "jobcenter"
  | "dokumente"
  | "vertraege"
  | "energie"

export type LayerZeroModule = {
  id: LayerZeroModuleId
  icon: LucideIcon
  /** Degrees clockwise from 12 o'clock. Inkasso sits upper-left, taxes near the top. */
  angle: number
  /**
   * A verified route, or null when the capability has no page of its own yet.
   * Every value here was checked against app/ and the catch-all page map; none
   * is invented. `null` renders an unavailable CTA rather than a dead link.
   */
  route: string | null
}

/**
 * Visual order around the core, clockwise from upper-left. The order matters:
 * it is what makes the orbit read as one system rather than a list.
 *
 * Inkasso has no page on this branch: /pruefung arrives with PR #79. Linking it
 * here would ship a dead link, so it stays selectable with an unavailable CTA
 * until that merges.
 */
export const LAYER_ZERO_MODULES: LayerZeroModule[] = [
  { id: "inkasso", icon: FileWarning, angle: -40, route: null },
  { id: "steuern", icon: Receipt, angle: 0, route: "/steuer" },
  { id: "tarife", icon: BarChart3, angle: 40, route: "/versicherungen" },
  { id: "rechte", icon: Scale, angle: 80, route: "/anspruch" },
  { id: "kindergeld", icon: Users, angle: 120, route: "/kindergeld" },
  { id: "jobcenter", icon: Briefcase, angle: 160, route: "/guide" },
  { id: "dokumente", icon: FileText, angle: 200, route: "/documents" },
  { id: "vertraege", icon: FileSignature, angle: 240, route: "/vertraege" },
  { id: "energie", icon: Zap, angle: 280, route: null },
]

/** The reference state shows Документи selected. */
export const LAYER_ZERO_DEFAULT: LayerZeroModuleId = "dokumente"

/** Vertical squash of the orbit, so it reads as a ring seen slightly from above. */
export const ORBIT_SQUASH = 0.92

export type OrbitGeometry = {
  size: number
  radius: number
  coreSize: number
  nodeSize: number
}

/**
 * Derive the geometry from the measured width rather than scaling a fixed
 * layout, so node and core sizes stay legible at every breakpoint instead of
 * shrinking together with a CSS transform.
 */
export function orbitGeometry(width: number): OrbitGeometry {
  const size = Math.max(280, Math.min(width, 760))
  const nodeSize = Math.max(64, Math.min(size * 0.135, 98))
  const coreSize = Math.max(176, Math.min(size * 0.42, 320))
  // Nodes sit on the ring line, kept fully inside the container.
  const radius = size / 2 - nodeSize / 2
  return { size, radius, coreSize, nodeSize }
}

export function nodePosition(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180
  return {
    x: Math.sin(rad) * radius,
    y: -Math.cos(rad) * radius * ORBIT_SQUASH,
  }
}

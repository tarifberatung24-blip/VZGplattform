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

/**
 * Node centre distance from the orbit centre, as a percentage of the box.
 * It is 50% minus half a node (13.5% / 2), so a node sitting at 0° or 90° still
 * lands fully inside the box instead of hanging over the edge and being clipped
 * by the hero's overflow.
 */
export const NODE_ORBIT_RADIUS = 43.25

/**
 * Node centres as percentages of the orbit box, so the ring is laid out by CSS
 * alone. Percentages resolve identically on the server and the client, which a
 * measured pixel layout could not do — the server has no width to measure, so it
 * would render a different geometry than the client and trip hydration.
 *
 * The orbit is square, so equal percentages give a circle; ORBIT_SQUASH is
 * applied by the CSS aspect ratio of the box itself.
 */
export function nodePositionPercent(angle: number) {
  const rad = (angle * Math.PI) / 180
  // Rounded to a fixed precision: React serialises floats to fewer decimals on
  // the server than on the client, so an unrounded value renders as "6.69873%"
  // on one side and "6.698729810778083%" on the other and trips hydration.
  const round = (n: number) => Math.round(n * 10000) / 10000
  return {
    x: round(50 + Math.sin(rad) * NODE_ORBIT_RADIUS),
    y: round(50 - Math.cos(rad) * NODE_ORBIT_RADIUS * ORBIT_SQUASH),
  }
}

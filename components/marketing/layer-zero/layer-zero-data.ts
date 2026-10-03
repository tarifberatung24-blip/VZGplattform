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
  /** Degrees clockwise from 12 o'clock. Документи sits at the bottom, 180°, so
   * the selected node lines up with the detail panel underneath it. */
  angle: number
  /**
   * The public explainer page for this capability. Every module has one, so a
   * node always leads somewhere real; the protected workspace is one step
   * further, behind the "Започни" CTA on that page.
   */
  route: string
}

/**
 * Visual order around the core, clockwise from the top. The order matters: it
 * is what makes the orbit read as one system rather than a list.
 *
 * Nine nodes sit on an even 40° ring, rotated so Документи lands at 180° — the
 * bottom of the ring, directly above the panel. That alignment is what makes
 * the orbit read as one connected instrument instead of a diagram plus a card.
 */
export const LAYER_ZERO_MODULES: LayerZeroModule[] = [
  { id: "steuern", icon: Receipt, angle: 340, route: "/modules/steuern" },
  { id: "tarife", icon: BarChart3, angle: 20, route: "/modules/tarife" },
  { id: "rechte", icon: Scale, angle: 60, route: "/modules/rechte" },
  { id: "kindergeld", icon: Users, angle: 100, route: "/modules/kindergeld" },
  { id: "jobcenter", icon: Briefcase, angle: 140, route: "/modules/jobcenter" },
  { id: "dokumente", icon: FileText, angle: 180, route: "/modules/dokumente" },
  { id: "vertraege", icon: FileSignature, angle: 220, route: "/modules/vertraege" },
  { id: "energie", icon: Zap, angle: 260, route: "/modules/energie" },
  { id: "inkasso", icon: FileWarning, angle: 300, route: "/modules/inkasso" },
]

/** The reference state shows Документи selected. */
export const LAYER_ZERO_DEFAULT: LayerZeroModuleId = "dokumente"

/** Ids only, for validating a slug before rendering a module page. */
export const LAYER_ZERO_MODULE_IDS: LayerZeroModuleId[] = LAYER_ZERO_MODULES.map((m) => m.id)

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

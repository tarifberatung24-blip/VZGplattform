/**
 * Reference-only Capital roadmap types and builder.
 * This file is intentionally outside the application source tree.
 */

export type RoadmapMilestone = {
  title: string
  metric: string
  targetValue: number | null
  targetDate: string | null
  status: "open" | "achieved" | "paused"
  customerCopy: { de?: string; bg?: string }
}

export type RoadmapInput = {
  currentDate: string
  targetDate: string | null
  goalTitle: string
  goalAmount: number | null
  currentSavings: number | null
  reserveTarget: number | null
  currency: "EUR"
}

export function buildReferenceRoadmap(input: RoadmapInput): RoadmapMilestone[] {
  return [
    {
      title: "Aktueller Ausgangspunkt",
      metric: "current_savings",
      targetValue: input.currentSavings,
      targetDate: input.currentDate,
      status: "open",
      customerCopy: { de: "Hier stehst du heute.", bg: "Тук си днес." },
    },
    {
      title: "Notfallreserve",
      metric: "emergency_reserve",
      targetValue: input.reserveTarget,
      targetDate: null,
      status: "open",
      customerCopy: { de: "Stabile Reserve nach bestätigten Annahmen.", bg: "Стабилен резерв според потвърдените допускания." },
    },
    {
      title: input.goalTitle,
      metric: "goal_amount",
      targetValue: input.goalAmount,
      targetDate: input.targetDate,
      status: "open",
      customerCopy: { de: "Dein bestätigtes Ziel.", bg: "Твоята потвърдена цел." },
    },
  ]
}

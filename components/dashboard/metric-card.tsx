import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  change: string
  isPositiveOutcome: boolean
  icon: LucideIcon
}

export function MetricCard({ title, value, change, isPositiveOutcome, icon: Icon }: MetricCardProps) {
  return (
    <Card className="bg-card border border-border cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className="p-2 bg-muted rounded-lg">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <p className="text-3xl font-semibold mb-2">{value}</p>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${
              isPositiveOutcome ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"
            }`}
          >
            {change} WoW
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

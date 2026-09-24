"use client"

import { useMemo } from "react"
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts"
import {
  ChartContainer,
  ChartConfig,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n/language-context"
import {
  buildRollingTwelveMonths,
  currentMonthLabel,
  type DeadlineLike,
} from "@/lib/dashboard/contracts-data"

export function TimelineChart({ deadlines }: { deadlines: DeadlineLike[] }) {
  const { locale } = useLanguage()
  const de = locale === "de"

  // The tooltip renders `config[key].label`, so the label follows the active locale.
  const config = useMemo(
    () => ({ count: { label: de ? "Fristen" : "Срокове", color: "var(--chart-1)" } }) satisfies ChartConfig,
    [de],
  )

  // Builds the actual rolling 12 months (correct across a year rollover) and labels them per
  // locale. The previous version matched every bucket against the current year and hardcoded the
  // first label as "Current", which leaked English into the Bulgarian view.
  const data = useMemo(() => buildRollingTwelveMonths(deadlines, locale), [deadlines, locale])
  const hasDeadlines = data.some((month) => month.count > 0)
  const markerLabel = currentMonthLabel(data)

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">
          {de ? "Fristen-Übersicht" : "Срокове — преглед"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasDeadlines ? (
          <p className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {de
              ? "Keine Fristen erfasst. Die nächsten zwölf Monate erscheinen, sobald Fristen vorliegen."
              : "Няма записани срокове. Следващите дванадесет месеца се показват, когато има срокове."}
          </p>
        ) : (
          <ChartContainer config={config} className="h-[300px] w-full">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={16}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip content={<ChartTooltipContent />} />
              {markerLabel ? (
                <ReferenceLine x={markerLabel} stroke="var(--primary)" strokeDasharray="4 4" />
              ) : null}
              <Line
                dataKey="count"
                type="linear"
                stroke="var(--color-count)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--color-count)" }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

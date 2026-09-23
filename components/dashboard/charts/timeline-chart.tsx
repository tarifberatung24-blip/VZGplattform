"use client"

import { useMemo } from "react"
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import {
  ChartContainer,
  ChartConfig,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n/language-context"

type Deadline = {
  id: string
  title: string
  due_at: string | null
  status: string | null
}

const chartConfig = {
  deadline: { label: "Deadline", color: "var(--primary)" },
} satisfies ChartConfig

export function TimelineChart({ deadlines }: { deadlines: Deadline[] }) {
  const { locale } = useLanguage()
  const de = locale === "de"

  const data = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const now = new Date()
    const currentMonth = now.getMonth()

    return months.map((month, index) => {
      const monthIndex = (currentMonth + index) % 12
      const count = deadlines.filter((d) => {
        if (!d.due_at) return false
        const dueDate = new Date(d.due_at)
        return dueDate.getMonth() === monthIndex && dueDate.getFullYear() === now.getFullYear()
      }).length
      return {
        month,
        count,
        label: month,
      }
    }).map((item, index) => ({
      ...item,
      label: index === 0 ? (de ? "Heute" : "Current") : item.month,
    }))
  }, [deadlines, de, locale])

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">
          {de ? "Fristen-Übersicht" : "Срокови — преглед"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <ReferenceLine x={de ? "Heute" : "Current"} stroke="var(--primary)" strokeDasharray="4 4" />
            <Line
              dataKey="count"
              type="linear"
              stroke="var(--color-deadline)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-deadline)" }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

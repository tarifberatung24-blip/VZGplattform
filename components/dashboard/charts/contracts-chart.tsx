"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  ChartContainer,
  ChartConfig,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n/language-context"

type Contract = {
  id: string
  title: string
  category: string
  provider_name: string | null
  monthly_amount: number | null
  status: string | null
}

const chartConfig = {
  contract: { label: "Vertrag", color: "var(--primary)" },
  expense: { label: "Ausgabe", color: "var(--chart-2)" },
} satisfies ChartConfig

export function ContractsChart({ contracts }: { contracts: Contract[] }) {
  const { locale } = useLanguage()
  const de = locale === "de"

  const data = useMemo(() => {
    const groups = new Map<string, number>()
    for (const c of contracts) {
      if (c.monthly_amount) {
        const cat = c.category || de ? "Sonstige" : "Различни"
        groups.set(cat, (groups.get(cat) ?? 0) + c.monthly_amount)
      }
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
      }))
  }, [contracts, de])

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">
          {de ? "Monatliche Kosten nach Kategorie" : "Месечни разходи по категория"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="category"
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
              tickFormatter={(v) => `${v} €`}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="amount" fill="var(--color-contract)" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill="var(--color-expense)" />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
